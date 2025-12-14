import { GoogleGenAI } from "@google/genai";

export class GeminiLiveService {
    private client: GoogleGenAI;
    private connection: any | null = null;
    private audioContext: AudioContext | null = null;
    private audioProcessor: ScriptProcessorNode | null = null;
    private mediaStream: MediaStream | null = null;
    private onTranscriptCallback: (text: string, isFinal: boolean) => void;
    private onErrorCallback: (error: string) => void;
    private onLogCallback: (message: string) => void;
    private isConnected: boolean = false;
    private shouldStayConnected: boolean = false; // Flag para manter conexão ativa
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000; // 2 segundos
    private isReconnecting: boolean = false;

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
        if (this.isConnected && !this.isReconnecting) return;

        this.shouldStayConnected = true;
        this.reconnectAttempts = 0;

        await this.attemptConnect();
    }

    private async attemptConnect() {
        if (!this.shouldStayConnected) return;

        this.onLogCallback(this.isReconnecting ?
            `Tentando reconectar (tentativa ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...` :
            "Iniciando conexão com Gemini Live...");

        try {
            // Limpar conexão anterior se existir
            if (this.connection) {
                try {
                    // Tenta fechar graciosamente se tiver método close/disconnect
                    const conn = this.connection as any;
                    if (typeof conn.close === 'function') conn.close();
                    if (typeof conn.disconnect === 'function') conn.disconnect();
                } catch (e) {
                    // Ignora erros ao limpar
                }
                this.connection = null;
            }

            const config: any = {
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

            // CORREÇÃO: Usando callbacks como exigido pelo SDK mais recente
            this.connection = await this.client.live.connect({
                model: "gemini-2.0-flash-exp",
                config: config as any,
                callbacks: {
                    onMessage: (message: any) => {
                        this.handleMessage(message);
                    },
                    onError: (error: any) => {
                        this.onLogCallback(`Erro no callback Gemini: ${error}`);
                        this.onErrorCallback(String(error));
                    },
                    onClose: () => {
                        this.onLogCallback("Conexão fechada pelo servidor via callback.");
                        this.isConnected = false;
                    }
                }
            } as any);

            this.isConnected = true;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.onLogCallback("Conexão WebSocket estabelecida com sucesso!");

            // Iniciar captura de áudio (se ainda não estiver ativa)
            if (!this.mediaStream || !this.audioContext) {
                await this.startAudioCapture();
            }

            // Não precisamos mais de listenToResponses explicitamente se os callbacks funcionarem,
            // mas se o SDK retornar um stream E callbacks, podemos manter o listenToResponses como fallback?
            // O erro original "Não foi possível encontrar stream iterável" sugere que o loop falhava.
            // Se usarmos callbacks, o loop não é necessário.

        } catch (error: any) {
            console.error("Erro ao conectar no Gemini Live:", error);
            this.isConnected = false;

            // Tenta reconectar se ainda deve ficar conectado
            if (this.shouldStayConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.isReconnecting = true;
                this.onLogCallback(`Falha na conexão. Tentando novamente em ${this.reconnectDelay / 1000}s...`);
                setTimeout(() => this.attemptConnect(), this.reconnectDelay);
            } else {
                this.onErrorCallback(error.message || "Erro de conexão com Gemini Live");
                this.disconnect();
            }
        }
    }

    // Processamento de mensagem extraído para método separado
    private handleMessage(message: any) {
        if (!this.isConnected) return; // Ignora se desconectado

        try {
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
        } catch (e) {
            console.error("Erro ao processar mensagem:", e);
        }
    }

    // Mantendo método vazio ou obsoleto para não quebrar referências internas se houver
    private async listenToResponses() {
        this.onLogCallback("Escutando respostas via callbacks (método stream desativado).");
        // Se o connect já configurou callbacks, aqui não fazemos nada.
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
                const base64Audio = this.arrayBufferToBase64(pcmData.buffer as ArrayBuffer);

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
        this.shouldStayConnected = false; // Para reconexões automáticas
        this.isConnected = false;
        this.isReconnecting = false;
        this.onLogCallback("Desconectando...");

        // Fechar conexão graciosamente
        if (this.connection) {
            try {
                const conn = this.connection as any;
                if (typeof conn.close === 'function') conn.close();
                if (typeof conn.disconnect === 'function') conn.disconnect();
            } catch (e) {
                // Ignora erros ao fechar
            }
            this.connection = null;
        }

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

    getMediaStream(): MediaStream | null {
        return this.mediaStream;
    }
}
