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

interface AudioBuffer {
    chunks: Float32Array[];
    startTime: number;
    lastSoundTime: number;
    isReady: boolean; // Se está pronto para transcrição
    isTranscribing: boolean; // Se está sendo transcrito
}

export class AudioRecordingService {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private audioProcessor: ScriptProcessorNode | null = null;
    private analyser: AnalyserNode | null = null;
    
    private isRecording: boolean = false;
    private shouldStop: boolean = false;
    
    // Três buffers rotativos para evitar gaps na gravação
    // IMPORTANTE: A API do Gemini suporta múltiplas requisições paralelas com UMA única chave
    // Não é necessário ter 3 chaves diferentes - uma chave pode processar múltiplos buffers simultaneamente
    private buffers: AudioBuffer[] = [
        { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
        { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
        { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
    ];
    private activeBufferIndex: number = 0;
    
    private callbacks: AudioRecordingCallbacks;
    private config: Required<AudioRecordingConfig>;
    private client: GoogleGenAI; // Um único cliente pode fazer múltiplas requisições paralelas
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
        this.callbacks.onLog("Iniciando gravação de áudio com 3 buffers rotativos...");

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
            
            this.audioProcessor.onaudioprocess = (e) => {
                if (!this.isRecording || this.shouldStop) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const volume = this.calculateVolume(inputData);
                const hasSound = volume > this.config.silenceThreshold;
                const now = Date.now();

                // Adiciona áudio a TODOS os buffers ativos (que não estão sendo transcritos)
                for (let i = 0; i < this.buffers.length; i++) {
                    const buffer = this.buffers[i];
                    
                    // Pula buffers que estão sendo transcritos ou que já foram marcados como ready
                    if (buffer.isTranscribing || buffer.isReady) continue;
                    
                    // Inicia novo buffer se necessário
                    if (buffer.startTime === 0) {
                        buffer.startTime = now;
                        this.callbacks.onLog(`Buffer ${i + 1} iniciado`);
                    }
                    
                    // Adiciona áudio ao buffer
                    buffer.chunks.push(new Float32Array(inputData));
                    
                    if (hasSound) {
                        buffer.lastSoundTime = now;
                    }
                }

                // Verifica condições para empacotar cada buffer
                this.checkAndPackageBuffers(now);
            };

            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            this.callbacks.onLog("Gravação iniciada com 3 buffers. Aguardando fala...");

        } catch (error: any) {
            this.callbacks.onError(`Erro ao iniciar gravação: ${error.message}`);
            this.stop();
        }
    }

    private checkAndPackageBuffers(now: number) {
        for (let i = 0; i < this.buffers.length; i++) {
            const buffer = this.buffers[i];
            
            // Pula se já está pronto ou sendo transcrito
            if (buffer.isReady || buffer.isTranscribing || buffer.chunks.length === 0) continue;
            
            const silenceDuration = now - buffer.lastSoundTime;
            const chunkDuration = now - buffer.startTime;
            
            // Verifica condições para empacotar:
            // 1. Silêncio por tempo suficiente E chunk tem duração mínima
            // 2. OU chunk atingiu duração máxima
            const shouldPackage = 
                (silenceDuration >= this.config.silenceDuration && 
                 chunkDuration >= this.config.minChunkDuration) ||
                chunkDuration >= this.config.maxChunkDuration;
            
            if (shouldPackage) {
                this.callbacks.onLog(`Buffer ${i + 1} pronto para transcrição (${Math.round(chunkDuration/1000)}s de duração, ${Math.round(silenceDuration/1000)}s de silêncio)`);
                
                // Marca como ready e inicia transcrição (não bloqueante)
                buffer.isReady = true;
                buffer.isTranscribing = true;
                
                // Processa em paralelo (não bloqueia a gravação)
                this.packageAndTranscribe(i, buffer, chunkDuration);
            }
        }
    }

    private async packageAndTranscribe(bufferIndex: number, buffer: AudioBuffer, duration: number) {
        try {
            // Cria uma cópia dos chunks para processar
            const chunksToProcess = [...buffer.chunks];
            
            // Libera o buffer imediatamente para voltar ao ciclo (CRÍTICO: não espera transcrição)
            buffer.chunks = [];
            buffer.startTime = 0;
            buffer.lastSoundTime = 0;
            buffer.isReady = false;
            
            // Conta quantas transcrições estão ativas
            const activeTranscriptions = this.buffers.filter(b => b.isTranscribing).length;
            this.callbacks.onLog(`Iniciando transcrição do Buffer ${bufferIndex + 1} (${activeTranscriptions + 1} transcrições ativas em paralelo)`);
            
            // Processa transcrição em paralelo (não bloqueia gravação)
            // IMPORTANTE: Não await aqui - processa em background
            this.transcribeBuffer(chunksToProcess, duration, bufferIndex).finally(() => {
                // Quando terminar, marca como disponível novamente
                buffer.isTranscribing = false;
                const remaining = this.buffers.filter(b => b.isTranscribing).length;
                this.callbacks.onLog(`Buffer ${bufferIndex + 1} concluído (${remaining} transcrições ainda ativas)`);
            });
            
        } catch (error: any) {
            buffer.isTranscribing = false;
            this.callbacks.onError(`Erro ao processar buffer ${bufferIndex + 1}: ${error.message}`);
        }
    }

    private async transcribeBuffer(chunks: Float32Array[], duration: number, bufferIndex: number) {
        try {
            // Converter Float32Array para Int16Array (PCM)
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const pcmData = new Int16Array(totalLength);
            
            let offset = 0;
            for (const chunk of chunks) {
                for (let i = 0; i < chunk.length; i++) {
                    const sample = Math.max(-1, Math.min(1, chunk[i]));
                    pcmData[offset + i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }
                offset += chunk.length;
            }

            // Converter para Base64
            const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
            const audioSizeKB = Math.round(base64Audio.length * 3 / 4 / 1024); // Aproximação: base64 é ~33% maior
            
            this.callbacks.onLog(`Buffer ${bufferIndex + 1}: Enviando ${Math.round(duration/1000)}s de áudio (${audioSizeKB}KB) para Gemini Flash...`);
            
            // Transcrever usando Gemini API (processamento paralelo - não bloqueia outros buffers)
            const transcription = await this.transcribeAudio(base64Audio);
            
            if (transcription && transcription.trim()) {
                this.callbacks.onTranscript(transcription.trim());
                this.callbacks.onLog(`Buffer ${bufferIndex + 1}: Transcrição recebida (${transcription.length} caracteres)`);
            } else {
                this.callbacks.onLog(`Buffer ${bufferIndex + 1}: Nenhuma transcrição retornada (possível silêncio)`);
            }
            
        } catch (error: any) {
            this.callbacks.onError(`Buffer ${bufferIndex + 1}: Erro ao transcrever: ${error.message}`);
        }
    }

    private async transcribeAudio(base64Audio: string): Promise<string> {
        const startTime = Date.now();
        try {
            // Chamada à API Gemini - pode rodar em paralelo com outras chamadas
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

            const duration = Date.now() - startTime;
            this.callbacks.onLog(`API Gemini respondeu em ${Math.round(duration/1000)}s`);
            
            return response.text || '';
        } catch (error: any) {
            const duration = Date.now() - startTime;
            this.callbacks.onLog(`Erro na API Gemini após ${Math.round(duration/1000)}s: ${error.message}`);
            throw new Error(`Falha na transcrição: ${error.message}`);
        }
    }

    private calculateVolume(buffer: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += Math.abs(buffer[i]);
        }
        return sum / buffer.length;
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

    getActiveBufferIndex(): number {
        // Retorna o índice do buffer que está mais "ativo" (não está sendo transcrito)
        for (let i = 0; i < this.buffers.length; i++) {
            const idx = (this.activeBufferIndex + i) % this.buffers.length;
            if (!this.buffers[idx].isTranscribing) {
                return idx;
            }
        }
        return this.activeBufferIndex;
    }

    async stop() {
        if (!this.isRecording) return;

        this.shouldStop = true;
        this.isRecording = false;
        this.callbacks.onLog("Parando gravação...");

        // Processar últimos chunks se houver
        const now = Date.now();
        for (let i = 0; i < this.buffers.length; i++) {
            const buffer = this.buffers[i];
            if (buffer.chunks.length > 0 && !buffer.isTranscribing) {
                const duration = now - buffer.startTime;
                if (duration >= this.config.minChunkDuration) {
                    buffer.isReady = true;
                    buffer.isTranscribing = true;
                    this.packageAndTranscribe(i, buffer, duration);
                }
            }
        }

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

        // Reset buffers
        this.buffers = [
            { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
            { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
            { chunks: [], startTime: 0, lastSoundTime: 0, isReady: false, isTranscribing: false },
        ];
        this.activeBufferIndex = 0;
        
        this.callbacks.onLog("Gravação parada");
    }
}
