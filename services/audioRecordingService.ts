import { GoogleGenAI } from "@google/genai";

export interface AudioRecordingCallbacks {
    onTranscript: (text: string) => void; // Chamado quando um pacote é transcrito
    onError: (error: string) => void;
    onLog: (message: string) => void;
}

export interface AudioRecordingConfig {
    silenceThreshold?: number; // Nível de volume mínimo para considerar silêncio (0-1)
    silenceDuration?: number; // Duração em ms de silêncio antes de empacotar
    minChunkDuration?: number; // Duração mínima do chunk em ms antes de enviar
    maxChunkDuration?: number; // Duração máxima do chunk em ms (força empacotamento)
    sampleRate?: number; // Taxa de amostragem (padrão 16000)
}

export class AudioRecordingService {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioProcessor: ScriptProcessorNode | null = null;
    private analyser: AnalyserNode | null = null;
    
    private isRecording: boolean = false;
    private shouldStop: boolean = false;
    
    private currentChunk: Blob[] = [];
    private chunkStartTime: number = 0;
    private lastSoundTime: number = 0;
    
    private callbacks: AudioRecordingCallbacks;
    private config: Required<AudioRecordingConfig>;
    private client: GoogleGenAI;
    private apiKey: string;

    constructor(
        apiKey: string,
        callbacks: AudioRecordingCallbacks,
        config: AudioRecordingConfig = {}
    ) {
        this.apiKey = apiKey;
        this.client = new GoogleGenAI({ apiKey });
        this.callbacks = callbacks;
        
        // Configuração padrão
        this.config = {
            silenceThreshold: config.silenceThreshold ?? 0.01, // 1% do volume máximo
            silenceDuration: config.silenceDuration ?? 2000, // 2 segundos de silêncio
            minChunkDuration: config.minChunkDuration ?? 3000, // Mínimo 3 segundos
            maxChunkDuration: config.maxChunkDuration ?? 60000, // Máximo 60 segundos
            sampleRate: config.sampleRate ?? 16000,
        };
    }

    async start() {
        if (this.isRecording) {
            this.callbacks.onLog("Gravação já está ativa");
            return;
        }

        this.shouldStop = false;
        this.isRecording = true;
        this.callbacks.onLog("Iniciando gravação de áudio...");

        try {
            // Solicitar acesso ao microfone
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: this.config.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            this.callbacks.onLog("Microfone acessado com sucesso");

            // Criar AudioContext
            this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Criar AnalyserNode para detecção de silêncio
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            source.connect(this.analyser);

            // Criar ScriptProcessor para capturar áudio
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            // Buffer para armazenar o áudio do chunk atual
            const audioChunks: Float32Array[] = [];
            
            this.audioProcessor.onaudioprocess = (e) => {
                if (!this.isRecording || this.shouldStop) return;

                const inputData = e.inputBuffer.getChannelData(0);
                
                // Detectar nível de volume para silêncio
                const volume = this.calculateVolume(inputData);
                const hasSound = volume > this.config.silenceThreshold;
                
                const now = Date.now();
                
                if (hasSound) {
                    this.lastSoundTime = now;
                    
                    // Iniciar novo chunk se necessário
                    if (this.chunkStartTime === 0) {
                        this.chunkStartTime = now;
                        this.callbacks.onLog("Novo pacote de áudio iniciado");
                    }
                    
                    // Adicionar ao buffer do chunk atual
                    audioChunks.push(new Float32Array(inputData));
                    
                } else {
                    // Sem som - verificar se deve empacotar
                    const silenceDuration = now - this.lastSoundTime;
                    const chunkDuration = now - this.chunkStartTime;
                    
                    // Se ainda tem áudio sendo capturado, continua
                    if (audioChunks.length > 0) {
                        audioChunks.push(new Float32Array(inputData));
                    }
                    
                    // Verifica condições para empacotar:
                    // 1. Silêncio por tempo suficiente E chunk tem duração mínima
                    // 2. OU chunk atingiu duração máxima
                    const shouldPackage = 
                        (silenceDuration >= this.config.silenceDuration && 
                         chunkDuration >= this.config.minChunkDuration) ||
                        chunkDuration >= this.config.maxChunkDuration;
                    
                    if (shouldPackage && audioChunks.length > 0) {
                        this.callbacks.onLog(`Empacotando áudio (${Math.round(chunkDuration/1000)}s de duração, ${Math.round(silenceDuration/1000)}s de silêncio)`);
                        this.packageAndTranscribe(audioChunks, chunkDuration);
                        audioChunks.length = 0; // Limpa o buffer
                        this.chunkStartTime = 0;
                        this.lastSoundTime = 0;
                    }
                }
            };

            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            this.callbacks.onLog("Gravação iniciada. Aguardando fala...");

        } catch (error: any) {
            this.callbacks.onError(`Erro ao iniciar gravação: ${error.message}`);
            this.stop();
        }
    }

    private calculateVolume(buffer: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += Math.abs(buffer[i]);
        }
        return sum / buffer.length;
    }

    private async packageAndTranscribe(audioChunks: Float32Array[], duration: number) {
        try {
            // Converter Float32Array para Int16Array (PCM)
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const pcmData = new Int16Array(totalLength);
            
            let offset = 0;
            for (const chunk of audioChunks) {
                for (let i = 0; i < chunk.length; i++) {
                    const sample = Math.max(-1, Math.min(1, chunk[i]));
                    pcmData[offset + i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }
                offset += chunk.length;
            }

            // Converter para Base64
            const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
            
            this.callbacks.onLog("Enviando áudio para transcrição...");
            
            // Transcrever usando Gemini API
            const transcription = await this.transcribeAudio(base64Audio);
            
            if (transcription && transcription.trim()) {
                this.callbacks.onTranscript(transcription.trim());
                this.callbacks.onLog(`Transcrição recebida (${transcription.length} caracteres)`);
            } else {
                this.callbacks.onLog("Nenhuma transcrição retornada (possível silêncio)");
            }
            
        } catch (error: any) {
            this.callbacks.onError(`Erro ao transcrever áudio: ${error.message}`);
        }
    }

    private async transcribeAudio(base64Audio: string): Promise<string> {
        try {
            const response = await this.client.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text: 'Transcreva esta gravação de consulta médica com precisão. Identifique falas de médico e paciente se possível. Não responda às perguntas, apenas transcreva o que é dito. Formate termos médicos corretamente.'
                        },
                        {
                            inlineData: {
                                data: base64Audio,
                                mimeType: 'audio/pcm;rate=16000'
                            }
                        }
                    ]
                }],
                config: {
                    temperature: 0.0,
                    maxOutputTokens: 4096,
                }
            });

            return response.text || '';
        } catch (error: any) {
            throw new Error(`Falha na transcrição: ${error.message}`);
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    getMediaStream(): MediaStream | null {
        return this.mediaStream;
    }

    async stop() {
        if (!this.isRecording) return;

        this.shouldStop = true;
        this.isRecording = false;
        this.callbacks.onLog("Parando gravação...");

        // Processar último chunk se houver
        // (implementar se necessário)

        // Limpar recursos
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        this.chunkStartTime = 0;
        this.lastSoundTime = 0;
        
        this.callbacks.onLog("Gravação parada");
    }
}

