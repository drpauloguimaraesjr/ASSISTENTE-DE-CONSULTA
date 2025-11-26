import { GoogleGenAI, LiveConfig, LiveConnection } from "@google/genai";

export class GeminiLiveService {
    private client: GoogleGenAI;
    private connection: LiveConnection | null = null;
    private audioContext: AudioContext | null = null;
    private audioProcessor: ScriptProcessorNode | null = null;
    private mediaStream: MediaStream | null = null;
    private onTranscriptCallback: (text: string, isFinal: boolean) => void;
    private onErrorCallback: (error: string) => void;
    private onLogCallback: (message: string) => void;
    private isConnected: boolean = false;

    constructor(
        apiKey: string,
        onTranscript: (text: string, isFinal: boolean) => void,
        onError: (error: string) => void,
        onLog: (message: string) => void
    ) {
        this.client = new GoogleGenAI({ apiKey });
        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError;
        this.onLogCallback = onLog;
    }

    async connect() {
        if (this.isConnected) return;

        this.onLogCallback("Iniciando conexão com Gemini Live...");

        try {
            const config: LiveConfig = {
                generationConfig: {
                    responseModalities: "text", // Queremos apenas texto de volta (transcrição)
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: "Você é um transcritor médico especialista. Sua tarefa é transcrever a consulta médica em tempo real com precisão absoluta. Identifique falas de médico e paciente se possível. Não responda às perguntas, apenas transcreva o que é dito. Formate termos médicos corretamente."
                    }]
                }
            };

            // CORREÇÃO: Passando o modelo no nível superior do objeto de opções
            this.connection = await this.client.live.connect({
                model: "gemini-2.0-flash-exp",
                config: config
            });

            this.isConnected = true;
            this.onLogCallback("Conexão WebSocket estabelecida com sucesso!");

            // Iniciar captura de áudio
            await this.startAudioCapture();

            // Ouvir respostas do Gemini
            this.listenToResponses();

        } catch (error: any) {
            console.error("Erro ao conectar no Gemini Live:", error);
            this.onErrorCallback(error.message || "Erro de conexão com Gemini Live");
            this.disconnect();
        }
    }

    private async listenToResponses() {
        if (!this.connection) return;

        this.onLogCallback("Aguardando respostas do Gemini...");

        try {
            for await (const message of this.connection) {
                if (message.serverContent?.modelTurn?.parts) {
                    for (const part of message.serverContent.modelTurn.parts) {
                        if (part.text) {
                            this.onLogCallback(`Texto recebido: ${part.text.substring(0, 50)}...`);
                            this.onTranscriptCallback(part.text, false);
                        }
                    }
                }

                if (message.serverContent?.turnComplete) {
                    this.onLogCallback("Turno completado pelo modelo.");
                    this.onTranscriptCallback("", true);
                }
            }
        } catch (error) {
            console.error("Erro no stream de resposta:", error);
            this.onErrorCallback("Erro no stream de resposta: " + String(error));
            this.disconnect();
        }
    }

    private async startAudioCapture() {
        this.onLogCallback("Solicitando acesso ao microfone...");
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000, // Gemini prefere 16kHz ou 24kHz
                }
            });
            this.onLogCallback("Microfone acessado com sucesso.");

            this.audioContext = new AudioContext({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Processador para converter áudio para PCM base64
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

            let chunkCount = 0;
            this.audioProcessor.onaudioprocess = (e) => {
                if (!this.connection || !this.isConnected) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Converter Float32Array para Int16Array (PCM)
                const pcmData = this.floatTo16BitPCM(inputData);

                // Converter para Base64
                const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

                // Enviar para o Gemini
                this.connection.send([{
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Audio
                }]);

                chunkCount++;
                if (chunkCount % 50 === 0) { // Log a cada ~2 segundos (50 * 4096 / 16000)
                    this.onLogCallback(`Enviados ${chunkCount} chunks de áudio...`);
                }
            };

            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination); // Necessário para o script processor rodar
            this.onLogCallback("Processamento de áudio iniciado.");

        } catch (error: any) {
            console.error("Erro ao capturar áudio:", error);
            this.onErrorCallback("Erro ao acessar microfone: " + error.message);
        }
    }

    disconnect() {
        this.isConnected = false;
        this.onLogCallback("Desconectando...");

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.connection = null;
        this.onLogCallback("Desconectado.");
    }

    // Utilitários de Áudio

    private floatTo16BitPCM(input: Float32Array): Int16Array {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}
