// Web Speech API service com otimizações para melhor precisão

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI: string;
    grammars: SpeechGrammarList;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

declare var webkitSpeechRecognition: {
    new (): SpeechRecognition;
};

declare var SpeechRecognition: {
    new (): SpeechRecognition;
};

export interface WebSpeechConfig {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
    maxAlternatives?: number;
}

export interface WebSpeechCallbacks {
    onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
    onError?: (error: string, message: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
}

export class WebSpeechService {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
    private currentTranscript: string = '';
    private buffers: string[] = ['', '', ''];
    private activeBufferIndex: number = 0;
    private callbacks: WebSpeechCallbacks;
    private lastActivityTime: number = Date.now();
    private heartbeatInterval: number | null = null;
    private consecutiveErrors: number = 0;
    private shouldAutoRestart: boolean = true;
    private restartAttempts: number = 0;
    private config: WebSpeechConfig;
    private SpeechRecognitionConstructor: typeof SpeechRecognition | null = null;
    private isRestarting: boolean = false; // Flag para evitar múltiplos restarts simultâneos

    constructor(callbacks: WebSpeechCallbacks, config: WebSpeechConfig = {}) {
        this.callbacks = callbacks;
        this.config = config;
        this.initializeRecognition(config);
        this.startHeartbeat();
    }

    private initializeRecognition(config: WebSpeechConfig) {
        // Detectar API disponível
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            throw new Error('Web Speech API não está disponível neste navegador. Use Chrome, Edge ou Safari.');
        }

        // Guarda o construtor para recriar se necessário
        this.SpeechRecognitionConstructor = SpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configurações otimizadas para português brasileiro
        this.recognition.lang = config.lang || 'pt-BR';
        this.recognition.continuous = config.continuous ?? true; // Captura contínua
        this.recognition.interimResults = config.interimResults ?? true; // Resultados intermediários
        this.recognition.maxAlternatives = config.maxAlternatives || 1;

        // Event handlers otimizados
        this.recognition.onstart = () => {
            this.isListening = true;
            this.lastActivityTime = Date.now();
            this.consecutiveErrors = 0;
            this.restartAttempts = 0; // Reset contador quando realmente inicia
            this.isRestarting = false; // Reset flag de restart
            this.shouldAutoRestart = true;
            this.callbacks.onStart?.();
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Marca atividade para o heartbeat
            this.lastActivityTime = Date.now();
            this.consecutiveErrors = 0;
            
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    
                    // Quando um resultado final chega, atualiza o buffer ativo
                    const idx = this.activeBufferIndex;
                    this.buffers[idx] += finalTranscript.trim();
                    
                    this.callbacks.onResult?.(this.buffers[idx], true, confidence || 0);
                    
                    // Rotaciona para próximo buffer quando recebe resultado final
                    if (finalTranscript.trim()) {
                        this.activeBufferIndex = (this.activeBufferIndex + 1) % 3;
                        this.buffers[this.activeBufferIndex] = '';
                    }
                } else {
                    // Resultado intermediário - atualiza apenas visualmente
                    interimTranscript += transcript;
                    const currentBufferText = this.buffers[this.activeBufferIndex] + interimTranscript;
                    this.callbacks.onResult?.(currentBufferText, false, confidence || 0);
                }
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            this.consecutiveErrors++;
            const timeSinceLastActivity = Date.now() - this.lastActivityTime;
            
            const errorMessages: Record<string, string> = {
                'no-speech': 'Nenhuma fala detectada. Continue falando.',
                'aborted': 'Reconhecimento interrompido.',
                'audio-capture': 'Erro ao capturar áudio. Verifique o microfone.',
                'network': 'Erro de rede. Verifique sua conexão.',
                'not-allowed': 'Permissão do microfone negada. Permita o acesso nas configurações do navegador.',
                'service-not-allowed': 'Serviço de reconhecimento não permitido.',
            };

            const message = errorMessages[event.error] || event.message || 'Erro desconhecido';
            
            // Log detalhado para debugging
            const errorDetail = `${event.error} - ${message} | Erros consecutivos: ${this.consecutiveErrors} | Tempo sem atividade: ${Math.round(timeSinceLastActivity / 1000)}s`;
            this.callbacks.onError?.(event.error, errorDetail);
            
            // Se houver muitos erros consecutivos ou erro crítico, marca para não auto-restartar
            if (this.consecutiveErrors >= 5 || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.shouldAutoRestart = false;
            }
        };

        this.recognition.onend = () => {
            const wasListening = this.isListening;
            this.isListening = false;
            
            // NÃO reinicia se já está fazendo restart forçado (evita conflito)
            if (this.isRestarting) {
                this.callbacks.onEnd?.();
                return;
            }
            
            // Reinicia automaticamente se deveria continuar e não foi intencionalmente parado
            if (wasListening && this.shouldAutoRestart && !this.isRestarting) {
                // Pequeno delay antes de reiniciar para evitar loops infinitos
                setTimeout(() => {
                    if (this.shouldAutoRestart && !this.isRestarting) {
                        try {
                            // Verifica se não está já rodando antes de tentar start
                            if (this.recognition && !this.isListening) {
                                this.recognition.start();
                            }
                        } catch (e) {
                            // Se falhar ao reiniciar, loga o erro
                            const errorMsg = e instanceof Error ? e.message : String(e);
                            if (errorMsg !== 'InvalidStateError' && !errorMsg.includes('already started')) {
                                this.callbacks.onError?.('restart-failed', `Falha ao reiniciar Web Speech: ${errorMsg}`);
                            }
                            this.callbacks.onEnd?.();
                        }
                    } else {
                        this.callbacks.onEnd?.();
                    }
                }, 100);
            } else {
                this.callbacks.onEnd?.();
            }
        };
    }

    start() {
        if (!this.recognition) {
            throw new Error('Reconhecimento não inicializado.');
        }

        if (this.isListening) {
            return;
        }

        this.currentTranscript = '';
        this.buffers = ['', '', ''];
        this.activeBufferIndex = 0;
        
        try {
            this.recognition.start();
        } catch (e) {
            // Ignora erro se já está rodando
            if ((e as Error).name !== 'InvalidStateError') {
                throw e;
            }
        }
    }

    private async forceRestart() {
        // Evita múltiplos restarts simultâneos
        if (this.isRestarting) {
            return;
        }
        
        const MAX_RESTART_ATTEMPTS = 3;
        
        if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
            this.isRestarting = true;
            this.callbacks.onError?.(
                'restart-max-attempts',
                `Falha ao reiniciar após ${MAX_RESTART_ATTEMPTS} tentativas. Recriando reconhecimento...`
            );
            
            // Recria reconhecimento do zero
            try {
                if (this.recognition) {
                    try {
                        this.recognition.abort();
                    } catch (e) {
                        // Ignora erros ao abortar
                    }
                }
                this.recognition = null;
                await new Promise(resolve => setTimeout(resolve, 1500));
                this.initializeRecognition(this.config);
                this.restartAttempts = 0;
                this.lastActivityTime = Date.now();
                this.isRestarting = false;
                
                if (this.SpeechRecognitionConstructor && this.shouldAutoRestart && this.recognition && !this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        const errorMsg = e instanceof Error ? e.message : String(e);
                        if (!errorMsg.includes('already started')) {
                            this.callbacks.onError?.('recreate-start-failed', `Falha ao iniciar reconhecimento recriado: ${errorMsg}`);
                        }
                    }
                }
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                this.callbacks.onError?.('recreate-failed', `Falha ao recriar reconhecimento: ${errorMsg}`);
                this.isRestarting = false;
            }
            return;
        }

        this.isRestarting = true;
        this.restartAttempts++;
        
        try {
            // Aborta atual (se ainda estiver rodando)
            if (this.recognition && this.isListening) {
                try {
                    this.recognition.abort();
                } catch (e) {
                    // Ignora erro se já foi abortado
                }
            }
            
            // Espera mais tempo para garantir que o abort terminou completamente
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Tenta reiniciar APENAS se não estiver já rodando
            if (this.shouldAutoRestart && this.recognition && !this.isListening) {
                this.lastActivityTime = Date.now();
                try {
                    this.recognition.start();
                    this.isRestarting = false;
                    
                    // Verifica se realmente iniciou após 2 segundos
                    setTimeout(() => {
                        if (!this.isListening && this.shouldAutoRestart) {
                            this.callbacks.onError?.(
                                'restart-verification-failed',
                                `Restart iniciado mas não confirmado como ativo. Tentando novamente...`
                            );
                            this.forceRestart(); // Tenta novamente
                        } else {
                            this.restartAttempts = 0; // Reset contador se funcionou
                        }
                    }, 2000);
                } catch (e) {
                    this.isRestarting = false;
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    
                    // Se já está rodando, não é erro - apenas espera
                    if (errorMsg.includes('already started')) {
                        this.restartAttempts = 0; // Reset se já está rodando
                        return;
                    }
                    
                    if (errorMsg !== 'InvalidStateError') {
                        this.callbacks.onError?.('restart-attempt-failed', `Tentativa ${this.restartAttempts} de restart falhou: ${errorMsg}`);
                        
                        // Se não é erro de estado, tenta novamente após delay maior
                        setTimeout(() => {
                            if (this.shouldAutoRestart && !this.isListening) {
                                this.forceRestart();
                            }
                        }, 3000);
                    }
                }
            } else {
                this.isRestarting = false;
            }
        } catch (e) {
            this.isRestarting = false;
            const errorMsg = e instanceof Error ? e.message : String(e);
            if (errorMsg !== 'InvalidStateError' && !errorMsg.includes('already started')) {
                this.callbacks.onError?.('restart-attempt-failed', `Tentativa ${this.restartAttempts} de restart falhou: ${errorMsg}`);
            }
        }
    }

    private startHeartbeat() {
        // OTIMIZADO: Verifica a cada 5 segundos para detectar travamentos rapidamente
        this.heartbeatInterval = window.setInterval(() => {
            if (!this.isListening || !this.recognition || this.isRestarting) {
                return;
            }

            const timeSinceLastActivity = Date.now() - this.lastActivityTime;
            // REDUZIDO: 12 segundos sem atividade = travamento detectado
            // (Web Speech API deveria emitir eventos mesmo sem fala, após alguns segundos de silêncio)
            const INACTIVITY_THRESHOLD = 12000; // 12 segundos

            // Detecta travamento silencioso
            if (timeSinceLastActivity > INACTIVITY_THRESHOLD) {
                this.callbacks.onError?.(
                    'silent-freeze',
                    `⚠️ TRAVAMENTO DETECTADO: ${Math.round(timeSinceLastActivity / 1000)}s sem resposta da API. Reiniciando automaticamente... (tentativa ${this.restartAttempts + 1}/${3})`
                );
                
                // Usa o novo método de restart robusto
                this.forceRestart();
            }
        }, 5000); // OTIMIZADO: Verifica a cada 5 segundos para reação rápida
    }

    stop() {
        this.shouldAutoRestart = false; // Previne auto-restart
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    abort() {
        this.shouldAutoRestart = false;
        if (this.recognition) {
            this.isListening = false;
            this.recognition.abort();
        }
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    getBuffers(): string[] {
        return [...this.buffers];
    }

    getActiveBufferIndex(): number {
        return this.activeBufferIndex;
    }
}

