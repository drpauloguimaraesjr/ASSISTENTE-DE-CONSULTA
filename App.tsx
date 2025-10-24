
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { ControlsPanel } from './components/ControlsPanel';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { InsightsPanel } from './components/InsightsPanel';
import { SettingsPanel, SettingsData } from './components/SettingsPanel';
import { Dashboard } from './components/Dashboard';
import { generateInsights, generateAnamnesis } from './services/geminiService';
import { decode, decodeAudioData, createBlob } from './utils/audioUtils';
import { Logo } from './components/Logo';

type Session = Awaited<ReturnType<GoogleGenAI['live']['connect']>>;

type AppState = 'pre-session' | 'in-session';
export type Theme = 'default' | 'matrix' | 'dusk' | 'light';

export interface SessionData {
    id: number;
    startTime: Date;
    endTime: Date;
    location: GeolocationPosition | null;
    transcriptionHistory: string[];
    anamnesis: string;
}

interface SessionInfo {
    startTime: Date;
    location: GeolocationPosition | null;
}

const DEFAULT_ANAMNESIS_PROMPT = `Você é um assistente de IA especializado em documentação médica. Sua tarefa é ouvir a transcrição de uma consulta e preencher a seguinte anamnese estruturada em tempo real. Use as informações fornecidas na transcrição para preencher cada seção da forma mais completa possível. Se uma informação não for mencionada, deixe o campo em branco ou indique "não informado". ATUALIZE a anamnese com base em TODA a transcrição a cada turno da conversa.

---
[NOME DO PACIENTE]
(escreva o nome do paciente conforme sea detectado no audio)

[QUEIXA PRINCIPAL]
(descreva com as palavras do paciente)

[HISTÓRIA DA DOENÇA ATUAL]
(tempo de início, evolução, fatores agravantes e atenuantes, tratamentos anteriores)

[MEDICAMENTOS EM USO]
(nome do medicamento – dose – frequência)

[ALERGIAS]
(a medicamentos, alimentos e ambientais – especificar tipo de reação)

[PATOLOGIAS PREGRESSAS]
(diabetes, hipertensão, dislipidemia, doenças autoimunes, etc)

[CIRURGIAS PRÉVIAS]
(tipo de cirurgia – ano – intercorrências)

[HISTÓRICO FAMILIAR]
(câncer, diabetes, hipertensão, doenças neurológicas, etc)

[HISTÓRICO SEXUAL E REPRODUTIVO]
– Filhos? (quantos, idades)
– Libido sexual (normal / reduzida / aumentada)
– Preventivos em dia? (mamografia, papanicolau, toque retal)

[ESTILO DE VIDA]
– Álcool: (frequência / quantidade)
– Tabagismo: (ativo / cessado / nunca fumou)
– Drogas recreativas: (tipo / uso atual ou passado)
– Sono: (horas por noite / qualidade)
– Estresse: (nível subjetivo de 0 a 10)
– Atividade física: (tipo / frequência)

[HISTÓRICO NUTRICIONAL]
– Frequência de consumo de ultraprocessados
– Consome vegetais e frutas diariamente?
– Hidratação adequada? (litros/dia)

[FLEXIBilidade ALIMENTAR]
(restrições – dietas – relação com a comida)

[EXAME FÍSICO]

Inspeção geral:
– Estado geral, hidratação, coloração de pele e mucosas

Antropometria:
– Peso: ___ kg
– Altura: ___ m
– IMC: ___ kg/m²

Sinais vitais:
– Frequência respiratória: ___ rpm
– Frequência cardíaca: ___ bpm
– Pressão arterial: ___ mmHg

Avaliação sistêmica:
– Cardiorrespiratório: (ex. murmúrios vesiculares presentes e simétricos, bulhas normofonéticas)
– Digestivo: (ex. abdome flácido, indolor, sem visceromegalias)
– Neurológico: (ex. reflexos preservados, força muscular 5/5)

[OBSERVAÇÕES FINAIS]
(anotações livres, suspeitas diagnósticas, diagnósticos diferenciais, condutas iniciais)
---`;


const SettingsIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
    </svg>
);


const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('pre-session');
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Pressione Iniciar para começar');
    const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
    const [currentTurnTranscription, setCurrentTurnTranscription] = useState('');
    
    const [insights, setInsights] = useState<string[]>([]);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    
    const [anamnesis, setAnamnesis] = useState('');
    const [isGeneratingAnamnesis, setIsGeneratingAnamnesis] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [anamnesisPrompt, setAnamnesisPrompt] = useState<string>(DEFAULT_ANAMNESIS_PROMPT);

    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
    const [theme, setTheme] = useState<Theme>('default');
    const [savedSessions, setSavedSessions] = useState<SessionData[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoSize, setLogoSize] = useState<number>(24);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);


    const liveSessionRef = useRef<Session | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const currentTurnRef = useRef('');
    const transcriptionHistoryRef = useRef<string[]>([]);
    const isMutedRef = useRef(isMuted);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTimeRef = useRef(0);

    useEffect(() => {
        const savedPrompt = localStorage.getItem('anamnesisPrompt');
        if (savedPrompt) setAnamnesisPrompt(savedPrompt);
        
        const savedDeviceId = localStorage.getItem('selectedAudioDeviceId');
        if (savedDeviceId) setSelectedDeviceId(savedDeviceId);
        
        const savedTheme = localStorage.getItem('appTheme') as Theme;
        if (savedTheme) setTheme(savedTheme);

        const savedLogo = localStorage.getItem('logoDataUrl');
        if (savedLogo) setLogoDataUrl(savedLogo);

        const savedLogoSize = localStorage.getItem('logoSize');
        if (savedLogoSize) setLogoSize(parseInt(savedLogoSize, 10));

        const storedSessions = localStorage.getItem('savedSessions');
        if (storedSessions) {
            const parsedSessions = JSON.parse(storedSessions, (key, value) => {
                 if (key === 'startTime' || key === 'endTime') {
                    return new Date(value);
                }
                return value;
            });
            setSavedSessions(parsedSessions);
        }
    }, []);

     useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const populateAudioDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
            setAudioDevices(audioInputDevices);
        } catch (error) {
            console.error("Error enumerating audio devices:", error);
        }
    };


    useEffect(() => {
        transcriptionHistoryRef.current = transcriptionHistory;
    }, [transcriptionHistory]);

     useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    const generateAndSetInsights = useCallback(async (transcript: string) => {
        setIsGeneratingInsights(true);
        try {
            const newInsight = await generateInsights(transcript);
            setInsights(prev => [...prev, newInsight]);
        } catch (error) {
            console.error('Error generating insights:', error);
            setInsights(prev => [...prev, 'Erro ao gerar insight.']);
        } finally {
            setIsGeneratingInsights(false);
        }
    }, []);

    const generateAndSetAnamnesis = useCallback(async (transcript: string) => {
        if (!transcript) return;
        setIsGeneratingAnamnesis(true);
        try {
            const newRecord = await generateAnamnesis(transcript, anamnesisPrompt);
            setAnamnesis(newRecord);
        } catch (error)
{
            console.error('Error generating anamnesis:', error);
            setAnamnesis(prev => prev + '\n\nErro ao atualizar anamnese.');
        } finally {
            setIsGeneratingAnamnesis(false);
        }
    }, [anamnesisPrompt]);

    const stopEverything = useCallback(() => {
        if (liveSessionRef.current) {
            liveSessionRef.current.close();
            liveSessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if(mediaStream){
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
         if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        setIsListening(false);
        setStatusMessage('Pressione Iniciar para começar');
        currentTurnRef.current = '';
        setCurrentTurnTranscription('');
        nextStartTimeRef.current = 0;
    }, [mediaStream]);

    const handleStartSession = () => {
        const startTime = new Date();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSessionInfo({ startTime, location: position });
                setAppState('in-session');
            },
            (error) => {
                console.warn("Could not get location, continuing without it.", error);
                setSessionInfo({ startTime, location: null });
                setAppState('in-session');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleEndAndSaveSession = () => {
        stopEverything();

        if (transcriptionHistory.length === 0 && !anamnesis) {
            setAppState('pre-session');
            return;
        }

        const sessionData: SessionData = {
            id: sessionInfo?.startTime.getTime() || Date.now(),
            startTime: sessionInfo!.startTime,
            endTime: new Date(),
            location: sessionInfo!.location,
            transcriptionHistory: transcriptionHistory,
            anamnesis: anamnesis,
        };
        
        const updatedSessions = [...savedSessions, sessionData];
        localStorage.setItem('savedSessions', JSON.stringify(updatedSessions));
        setSavedSessions(updatedSessions);
        
        setTranscriptionHistory([]);
        setCurrentTurnTranscription('');
        setInsights([]);
        setAnamnesis('');
        setSessionInfo(null);
        
        setAppState('pre-session');
    };

    const handleToggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const handleSaveSettings = (settings: SettingsData) => {
        setAnamnesisPrompt(settings.prompt);
        localStorage.setItem('anamnesisPrompt', settings.prompt);

        setTheme(settings.theme);
        localStorage.setItem('appTheme', settings.theme);

        setLogoDataUrl(settings.logoUrl);
        if (settings.logoUrl) {
            localStorage.setItem('logoDataUrl', settings.logoUrl);
        } else {
            localStorage.removeItem('logoDataUrl');
        }

        setLogoSize(settings.logoSize);
        localStorage.setItem('logoSize', settings.logoSize.toString());

        if (transcriptionHistory.length > 0) {
            generateAndSetAnamnesis(transcriptionHistory.join('\n\n'));
        }
    };

    const handleResetPrompt = () => {
        setAnamnesisPrompt(DEFAULT_ANAMNESIS_PROMPT);
        localStorage.removeItem('anamnesisPrompt');
        return DEFAULT_ANAMNESIS_PROMPT;
    };

    const handleDeviceChange = (deviceId: string) => {
        setSelectedDeviceId(deviceId);
        localStorage.setItem('selectedAudioDeviceId', deviceId);
        if (isListening) {
            stopEverything();
            setStatusMessage('Microfone alterado. Pressione Iniciar para recomeçar.');
        }
    };

    const handleToggleListening = useCallback(async () => {
        if (isListening) {
            stopEverything();
            return;
        }

        if (!process.env.API_KEY) {
            setStatusMessage('API Key do Gemini não encontrada.');
            return;
        }

        setIsListening(true);
        setStatusMessage('Conectando...');

        try {
            const audioConstraints = selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            mediaStreamRef.current = stream;
            setMediaStream(stream);

            await populateAudioDevices();

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
                },
                callbacks: {
                    onopen: () => {
                        setStatusMessage('Ouvindo... Fale agora.');
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        audioProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = createBlob(inputData);
                            sessionPromise.then(session => {
                                liveSessionRef.current = session;
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentTurnRef.current += text;
                            setCurrentTurnTranscription(currentTurnRef.current);
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            const finalTurnText = currentTurnRef.current.trim();
                            if (finalTurnText) {
                                const newHistory = [...transcriptionHistoryRef.current, finalTurnText];
                                const fullTranscript = newHistory.join('\n\n');
                                setTranscriptionHistory(newHistory);
                                generateAndSetInsights(fullTranscript);
                                generateAndSetAnamnesis(fullTranscript);
                            }
                            currentTurnRef.current = '';
                            setCurrentTurnTranscription('');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current && !isMutedRef.current) {
                           nextStartTimeRef.current = Math.max(
                                nextStartTimeRef.current,
                                outputAudioContextRef.current.currentTime
                            );
                           const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                outputAudioContextRef.current,
                                24000,
                                1,
                            );
                            
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                                sourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: Error) => {
                        console.error('API Error:', e);
                        setStatusMessage(`Erro: ${e.message}`);
                        stopEverything();
                    },
                    onclose: () => {
                        console.log('API connection closed.');
                    },
                },
            });

        } catch (error) {
            console.error('Error starting listener:', error);
            setStatusMessage('Erro ao acessar o microfone.');
            setIsListening(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, stopEverything, generateAndSetInsights, generateAndSetAnamnesis, selectedDeviceId]);


    return (
        <>
            {appState === 'pre-session' ? (
                <Dashboard 
                    onStartSession={handleStartSession}
                    savedSessions={savedSessions}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    logoDataUrl={logoDataUrl}
                    logoSize={logoSize}
                />
            ) : (
                <div className="h-screen w-screen flex flex-col text-primary p-4 font-sans">
                    <header className="flex-shrink-0 pb-4 flex justify-between items-center">
                        <Logo logoDataUrl={logoDataUrl} size={logoSize} />
                        <div className='flex items-center gap-4'>
                            <button
                                onClick={handleEndAndSaveSession}
                                className="px-4 py-2 text-sm font-medium rounded-md btn-danger text-white transition-colors"
                            >
                                Encerrar Sessão
                            </button>
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 text-secondary hover:text-primary transition-colors"
                                aria-label="Abrir configurações"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </header>
                    <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                        <TranscriptionPanel 
                            history={transcriptionHistory}
                            anamnesis={anamnesis}
                            isAnamnesisLoading={isGeneratingAnamnesis}
                            sessionInfo={sessionInfo}
                        />
                        <ControlsPanel 
                            isListening={isListening}
                            statusMessage={statusMessage}
                            currentTranscription={currentTurnTranscription}
                            onToggleListening={handleToggleListening}
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
                            audioDevices={audioDevices}
                            selectedDeviceId={selectedDeviceId}
                            onDeviceChange={handleDeviceChange}
                            mediaStream={mediaStream}
                        />
                        <InsightsPanel insights={insights} isLoading={isGeneratingInsights} />
                    </main>
                </div>
            )}
            <SettingsPanel 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                onResetPrompt={handleResetPrompt}
                initialSettings={{
                    prompt: anamnesisPrompt,
                    theme: theme,
                    logoUrl: logoDataUrl,
                    logoSize: logoSize,
                }}
            />
        </>
    );
};

export default App;
