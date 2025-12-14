import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { User } from 'firebase/auth';
import * as firebaseService from './services/firebaseService';

// Lazy load de componentes pesados
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const KnowledgePanel = lazy(() => import('./components/KnowledgePanel').then(module => ({ default: module.KnowledgePanel })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(module => ({ default: module.LoginScreen })));

// Componentes leves - importação direta
import { ControlsPanel } from './components/ControlsPanel';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { InsightsPanel } from './components/InsightsPanel';
import { Logo } from './components/Logo';
import { Clock } from './components/Clock';
import { SessionTimer } from './components/SessionTimer';

// Serviços - lazy load apenas quando necessário
import { generateInsightsWithFailover, generateAnamnesisWithFailover } from './services/geminiService';
import { AudioRecordingService } from './services/audioRecordingService';
import { GeminiLiveService } from './services/geminiLiveService';
import { tokenTracker, TokenStats } from './services/tokenTracker';
import { medicalKnowledgeService } from './services/medicalKnowledgeService';
import { proceduralMemoryService } from './services/proceduralMemoryService';
import { useLogger } from './hooks/useLogger';
import { uploadFile } from './services/googleDriveService';
import { getPatientName } from './utils/sessionUtils';

import type { SettingsData, WaveformStyle, InsightProvider, PrebuiltVoice } from './components/SettingsPanel';
import type { GDriveSettings } from './services/googleDriveService';

type AppState = 'pre-session' | 'in-session';
export type Theme = 'default' | 'matrix' | 'dusk' | 'light';

// A plain, serializable object to store coordinates
export interface SerializableCoords {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
}

// A plain, serializable object to store location data
export interface SerializableLocation {
    coords: SerializableCoords;
    timestamp: number;
}


export interface SessionData {
    id: string;
    startTime: Date;
    endTime: Date | null;
    location: SerializableLocation | null; // Use the serializable type
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

[CIRURGIAS PRÉVIas]
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
– Digestivo: (ex. abdome flácido, indolor, sem visceromegalia)
– Neurológico: (ex. reflexos preservados, força muscular 5/5)

[OBSERVAÇÕES FINAIS]
(anotações livres, suspeitas diagnósticas, diagnósticos diferenciais, condutas iniciais)
---`;

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24-.42-.12-.64l2 3.46c.12-.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
);


const App: React.FC = () => {
    const { logs, log, clearLogs } = useLogger();

    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

    // App State
    const [appState, setAppState] = useState<AppState>('pre-session');
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

    // Session State
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Pressione Iniciar para começar');
    const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);

    // Gemini Live State
    const [currentLiveTranscript, setCurrentLiveTranscript] = useState('');

    // AI State
    const [insights, setInsights] = useState<string[]>([]);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [lastError, setLastError] = useState<string | undefined>(undefined);
    const [anamnesis, setAnamnesis] = useState('');
    const [isGeneratingAnamnesis, setIsGeneratingAnamnesis] = useState(false);
    const [tokenStats, setTokenStats] = useState<TokenStats>(tokenTracker.getStats());
    const [anamnesisMode, setAnamnesisMode] = useState<'live' | 'manual'>('live');
    const [isKnowledgePanelOpen, setIsKnowledgePanelOpen] = useState(false);

    // UI & Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [anamnesisPrompt, setAnamnesisPrompt] = useState<string>(DEFAULT_ANAMNESIS_PROMPT);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
    const [theme, setTheme] = useState<Theme>('default');
    const [savedSessions, setSavedSessions] = useState<SessionData[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoSize, setLogoSize] = useState<number>(24);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [waveformStyle, setWaveformStyle] = useState<WaveformStyle>('traktor');
    const [insightsProvider, setInsightsProvider] = useState<InsightProvider>('gemini');
    const [activeInsightsProvider, setActiveInsightsProvider] = useState<InsightProvider | null>('gemini');
    const [voiceName, setVoiceName] = useState<PrebuiltVoice>('Zephyr');
    const [apiKeys, setApiKeys] = useState({ gemini: '', openai: '', grok: '' });
    const [gdriveSettings, setGdriveSettings] = useState<GDriveSettings>({
        clientId: '177602030589-ob4l1rms4snqmv5otl9bhiavn6uhjr0k.apps.googleusercontent.com',
        loginHint: '',
        folder: null,
        user: null,
        token: null,
    });

    // Refs
    const transcriptionHistoryRef = useRef<string[]>([]);
    const audioRecordingServiceRef = useRef<AudioRecordingService | null>(null);

    // --- Initialize Knowledge Services ---
    useEffect(() => {
        medicalKnowledgeService.loadKnowledge();
        proceduralMemoryService.loadPatterns();
        const saveInterval = setInterval(() => {
            medicalKnowledgeService.saveKnowledge();
            proceduralMemoryService.savePatterns();
        }, 60000);
        return () => clearInterval(saveInterval);
    }, []);

    // --- Auth and Data Loading Effect ---
    useEffect(() => {
        const configured = firebaseService.isFirebaseConfigured();
        setIsFirebaseConfigured(configured);

        if (configured) {
            firebaseService.initializeApp();
            const unsubscribe = firebaseService.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    setIsGuest(false);
                    log('INFO', `Usuário ${firebaseUser.email} autenticado.`);

                    const userSettings = await firebaseService.fetchUserSettings(firebaseUser.uid);
                    if (userSettings) {
                        setAnamnesisPrompt(userSettings.prompt || DEFAULT_ANAMNESIS_PROMPT);
                        setTheme(userSettings.theme || 'default');
                        setLogoDataUrl(userSettings.logoUrl || null);
                        setLogoSize(userSettings.logoSize || 24);
                        setWaveformStyle(userSettings.waveformStyle || 'line');
                        setVoiceName(userSettings.voiceName || 'Zephyr');
                        setInsightsProvider(userSettings.insightsProvider || 'gemini');
                        setActiveInsightsProvider(userSettings.insightsProvider || 'gemini');
                        setApiKeys(userSettings.apiKeys || { gemini: '', openai: '', grok: '' });
                        setGdriveSettings(prev => ({ ...prev, ...userSettings.gdrive, token: null }));
                        setSelectedDeviceId(userSettings.selectedDeviceId);
                    }

                    const sessions = await firebaseService.fetchSessions(firebaseUser.uid);
                    setSavedSessions(sessions);
                } else {
                    setUser(null);
                    setSavedSessions([]);
                }
                setAuthLoading(false);
            });
            return unsubscribe;
        } else {
            log('WARN', 'Firebase não está configurado. A autenticação está desativada.');
            setAuthLoading(false);
            setUser(null);
        }
    }, [log]);


    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const populateAudioDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
            setAudioDevices(audioInputDevices);
            if (!selectedDeviceId && audioInputDevices.length > 0) {
                setSelectedDeviceId(audioInputDevices[0].deviceId);
            }
        } catch (error) {
            console.error("Error enumerating audio devices:", error);
            log('ERROR', 'Falha ao enumerar dispositivos de áudio.');
        }
    };


    useEffect(() => {
        transcriptionHistoryRef.current = transcriptionHistory;
    }, [transcriptionHistory]);

    // Populate devices on mount
    useEffect(() => {
        if (navigator?.mediaDevices) {
            populateAudioDevices();
            const handleDeviceChange = () => populateAudioDevices();
            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
            return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
    }, []);

    const generateAndSetInsights = useCallback(async (transcript: string) => {
        setIsGeneratingInsights(true);
        try {
            const { insight, provider } = await generateInsightsWithFailover(
                transcript,
                insightsProvider,
                { openai: apiKeys.openai, grok: apiKeys.grok }
            );
            setInsights(prev => [...prev, insight]);
            if (provider) setActiveInsightsProvider(provider);
            log('API', `Insight gerado com sucesso por: ${provider?.toUpperCase() ?? 'N/A'}`);
        } catch (error: any) {
            const message = error.message || String(error);
            setLastError(message);
            log('ERROR', `Erro ao gerar insight: ${message}`);
            setInsights(prev => [...prev, 'Erro ao gerar insight.']);
        } finally {
            setIsGeneratingInsights(false);
        }
    }, [insightsProvider, apiKeys, log]);

    const generateAndSetAnamnesis = useCallback(async (transcript: string) => {
        if (!transcript) return;
        setIsGeneratingAnamnesis(true);
        try {
            const { anamnesis: newAnamnesis, provider } = await generateAnamnesisWithFailover(
                transcript,
                anamnesisPrompt,
                insightsProvider,
                { openai: apiKeys.openai, grok: apiKeys.grok },
                anamnesis
            );
            setAnamnesis(newAnamnesis);
            if (provider) log('API', `Anamnese atualizada por: ${provider.toUpperCase()}`);
        } catch (error: any) {
            const message = error.message || String(error);
            setLastError(message);
            log('ERROR', `Erro ao atualizar anamnese: ${message}`);
            setAnamnesis(prev => prev + '\n\nErro ao atualizar anamnese.');
        } finally {
            setIsGeneratingAnamnesis(false);
        }
    }, [anamnesisPrompt, insightsProvider, apiKeys, log, anamnesis]);

    const stopEverything = useCallback(() => {
        log('INFO', 'Parando gravação e processos...');

        if (audioRecordingServiceRef.current) {
            audioRecordingServiceRef.current.stop();
            audioRecordingServiceRef.current = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }

        setIsListening(false);
        setStatusMessage('Pressione Iniciar para começar');
        setCurrentLiveTranscript('');
    }, [mediaStream, log]);

    // Atualiza estatísticas de tokens periodicamente
    useEffect(() => {
        const interval = setInterval(() => {
            setTokenStats(tokenTracker.getStats());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Salvamento automático de transcrições em localStorage (backup)
    useEffect(() => {
        if (appState === 'in-session' && transcriptionHistory.length > 0) {
            const backupData = {
                timestamp: Date.now(),
                transcriptionHistory,
                anamnesis,
                insights,
                sessionInfo: sessionInfo ? {
                    startTime: sessionInfo.startTime.toISOString(),
                    location: sessionInfo.location
                } : null
            };
            try {
                localStorage.setItem('transcription_backup', JSON.stringify(backupData));
                localStorage.setItem('transcription_backup_time', Date.now().toString());
            } catch (e) {
                console.warn('Falha ao salvar backup de transcrição:', e);
            }
        }
    }, [transcriptionHistory, anamnesis, insights, sessionInfo, appState]);

    const handleStartSession = () => {
        log('INFO', 'Iniciando nova sessão.');
        clearLogs();
        tokenTracker.reset();
        setTokenStats(tokenTracker.getStats());
        const startTime = new Date();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSessionInfo({ startTime, location: position });
                setAppState('in-session');
            },
            (error) => {
                log('WARN', `Não foi possível obter a localização: ${error.message}`);
                setSessionInfo({ startTime, location: null });
                setAppState('in-session');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleGoogleDriveUpload = async (sessionData: SessionData) => {
        if (!gdriveSettings.token || !gdriveSettings.folder?.id) {
            log('WARN', 'Upload para o Google Drive ignorado: não configurado.');
            return;
        }
        log('INFO', 'Iniciando upload para o Google Drive...');
        try {
            const patientName = getPatientName(sessionData.anamnesis) || 'PacienteNaoIdentificado';
            const timestamp = new Date(sessionData.startTime).toISOString().slice(0, 10);
            const transcriptionFileName = `Transcricao-${patientName}-${timestamp}.txt`;
            const transcriptionContent = `Transcrição da Sessão - ${patientName}\nInício: ${sessionData.startTime.toLocaleString('pt-BR')}\n\n${sessionData.transcriptionHistory.join('\n\n')}`;
            await uploadFile(gdriveSettings.token.access_token, gdriveSettings.folder.id, transcriptionFileName, transcriptionContent);
            log('API', `Arquivo de transcrição '${transcriptionFileName}' salvo no Google Drive.`);
            const anamnesisFileName = `Anamnese-${patientName}-${timestamp}.txt`;
            const anamnesisContent = `Anamnese da Sessão - ${patientName}\nData: ${sessionData.startTime.toLocaleString('pt-BR')}\n\n${sessionData.anamnesis}`;
            await uploadFile(gdriveSettings.token.access_token, gdriveSettings.folder.id, anamnesisFileName, anamnesisContent);
            log('API', `Arquivo de anamnese '${anamnesisFileName}' salvo no Google Drive.`);
        } catch (error: any) {
            log('ERROR', `Falha no upload para o Google Drive: ${error.message || 'Erro desconhecido'}`);
        }
    };


    const handleEndAndSaveSession = async () => {
        log('INFO', 'Encerrando sessão...');
        stopEverything();

        const isSessionEmpty = transcriptionHistory.length === 0 && !anamnesis;

        if (isGuest || !user) {
            alert('Você está no modo convidado. A sessão não será salva.\n\nFaça login para salvar seu progresso.');
        } else if (isSessionEmpty) {
            alert('A sessão estava vazia e não foi salva.');
        } else {
            log('INFO', 'Salvando dados da sessão.');

            const locationData: SerializableLocation | null = sessionInfo?.location ? {
                coords: {
                    latitude: sessionInfo.location.coords.latitude,
                    longitude: sessionInfo.location.coords.longitude,
                    accuracy: sessionInfo.location.coords.accuracy,
                    altitude: sessionInfo.location.coords.altitude,
                    altitudeAccuracy: sessionInfo.location.coords.altitudeAccuracy,
                    heading: sessionInfo.location.coords.heading,
                    speed: sessionInfo.location.coords.speed,
                },
                timestamp: sessionInfo.location.timestamp,
            } : null;

            const sessionData: Omit<SessionData, 'id'> = {
                startTime: sessionInfo!.startTime,
                endTime: new Date(),
                location: locationData,
                transcriptionHistory: transcriptionHistory,
                anamnesis: anamnesis,
            };

            try {
                const newSessionId = await firebaseService.saveSession(user.uid, sessionData);
                if (newSessionId) {
                    const newSession = { ...sessionData, id: newSessionId, endTime: sessionData.endTime as Date };
                    setSavedSessions(prev => [newSession, ...prev]);
                    await handleGoogleDriveUpload(newSession);
                    log('API', 'Sessão salva com sucesso no Firebase e Google Drive.');
                }
            } catch (error: any) {
                log('ERROR', `Falha ao salvar a sessão: ${error.message}`);
                alert(`Ocorreu um erro ao salvar a sessão no banco de dados: ${error.message}`);
            }
        }

        setTranscriptionHistory([]);
        setInsights([]);
        setAnamnesis('');
        setSessionInfo(null);
        setAppState('pre-session');
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!user) return;
        await firebaseService.deleteSession(user.uid, sessionId);
        const updatedSessions = savedSessions.filter(session => session.id !== sessionId);
        setSavedSessions(updatedSessions);
    };

    const handleToggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const handleSaveSettings = async (settings: SettingsData) => {
        setAnamnesisPrompt(settings.prompt);
        setTheme(settings.theme);
        setLogoDataUrl(settings.logoUrl);
        setLogoSize(settings.logoSize);
        setWaveformStyle(settings.waveformStyle);
        setVoiceName(settings.voiceName);
        setInsightsProvider(settings.insightsProvider);
        setActiveInsightsProvider(settings.insightsProvider);
        setApiKeys(settings.apiKeys);
        setGdriveSettings(settings.gdrive);

        if (user) {
            const settingsToSave = {
                prompt: settings.prompt,
                theme: settings.theme,
                logoUrl: settings.logoUrl,
                logoSize: settings.logoSize,
                waveformStyle: settings.waveformStyle,
                voiceName: settings.voiceName,
                insightsProvider: settings.insightsProvider,
                apiKeys: settings.apiKeys,
                gdrive: { ...settings.gdrive, token: null },
                selectedDeviceId: selectedDeviceId,
            };
            await firebaseService.saveUserSettings(user.uid, settingsToSave);
        }

        if (transcriptionHistory.length > 0 && appState === 'in-session') {
            generateAndSetAnamnesis(transcriptionHistory.join('\n\n'));
        }
    };

    const handleResetPrompt = () => {
        setAnamnesisPrompt(DEFAULT_ANAMNESIS_PROMPT);
        return DEFAULT_ANAMNESIS_PROMPT;
    };

    const handleDeviceChange = (deviceId: string) => {
        log('INFO', `Dispositivo de áudio alterado para: ${deviceId}`);
        setSelectedDeviceId(deviceId);
        if (isListening) {
            stopEverything();
            setStatusMessage('Microfone alterado. Pressione Iniciar para recomeçar.');
        }
    };

    const handleToggleAnamnesisMode = useCallback(() => {
        setAnamnesisMode(prev => prev === 'live' ? 'manual' : 'live');
        log('INFO', `Modo de anamnese alterado para: ${anamnesisMode === 'live' ? 'MANUAL' : 'LIVE'}`);
    }, [anamnesisMode, log]);

    const handleGenerateAnamnesis = useCallback(() => {
        if (transcriptionHistory.length === 0) {
            log('WARN', 'Não há transcrição para gerar anamnese.');
            return;
        }
        const fullTranscript = transcriptionHistory.join('\n\n');
        generateAndSetAnamnesis(fullTranscript);
        log('INFO', 'Gerando anamnese manualmente...');
    }, [transcriptionHistory, generateAndSetAnamnesis, log]);

    // --- Handle Toggle Listening with Gemini Live (WebSocket) ---
    const handleToggleListening = useCallback(async () => {
        if (isListening) {
            stopEverything();
            return;
        }

        const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
        if (!GEMINI_API_KEY) {
            alert("Erro: Chave de API do Gemini não encontrada. Verifique as configurações.");
            return;
        }

        setIsListening(true);
        setStatusMessage('Conectando ao Gemini Live...');

        const service = new GeminiLiveService(
            GEMINI_API_KEY,
            (text, isFinal) => {
                if (isFinal) {
                    // Turno completo - mover acumulado para histórico
                    setCurrentLiveTranscript(current => {
                        if (current.trim()) {
                            setTranscriptionHistory(prev => {
                                const newHistory = [...prev, current];
                                const fullTranscript = newHistory.join('\n\n');
                                // Trigger background tasks
                                generateAndSetInsights(fullTranscript);
                                if (anamnesisMode === 'live') {
                                    generateAndSetAnamnesis(fullTranscript);
                                }
                                return newHistory;
                            });
                        }
                        return ''; // Limpa atual
                    });
                } else {
                    // Texto incremental (stream)
                    setCurrentLiveTranscript(prev => prev + text);
                }
            },
            (error) => {
                setStatusMessage(`Erro: ${error}`);
                setLastError(error);
                log('ERROR', error);
                setIsListening(false);
            },
            (message) => {
                // Log interno do serviço
                if (message.includes('Conexão WebSocket estabelecida')) {
                    setStatusMessage('🟢 Gemini Live Conectado (Escutando...)');
                }
                log('INFO', `[Gemini Live] ${message}`);
            }
        );

        // Armazenamos como any para facilitar a troca, mas idealmente atualizaríamos o tipo da ref
        (audioRecordingServiceRef.current as any) = service;

        try {
            await service.connect(); // Inicia conexão e áudio

            // Hack para pegar o mediaStream do serviço Live para o visualizador
            // Assumindo que criamos o método getMediaStream no GeminiLiveService
            const stream = service.getMediaStream();
            if (stream) {
                setMediaStream(stream);
            }

        } catch (e: any) {
            setStatusMessage(`Erro ao iniciar: ${e.message}`);
            setIsListening(false);
        }

    }, [isListening, stopEverything, generateAndSetInsights, generateAndSetAnamnesis, anamnesisMode, log]);

    if (authLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <svg className="animate-spin h-10 w-10 spinner-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    let mainContent;
    if (!user && !isGuest) {
        mainContent = (
            <Suspense fallback={
                <div className="h-screen w-screen flex items-center justify-center">
                    <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                </div>
            }>
                <LoginScreen
                    onLogin={firebaseService.signInWithGoogle}
                    isConfigured={isFirebaseConfigured}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onContinueAsGuest={() => setIsGuest(true)}
                />
            </Suspense>
        );
    } else if (appState === 'pre-session') {
        mainContent = (
            <Suspense fallback={
                <div className="h-screen w-screen flex items-center justify-center">
                    <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                </div>
            }>
                <Dashboard
                    user={user}
                    isGuest={isGuest}
                    onLoginRequest={() => setIsGuest(false)}
                    onStartSession={handleStartSession}
                    savedSessions={savedSessions}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    logoDataUrl={logoDataUrl}
                    logoSize={logoSize}
                    onDeleteSession={handleDeleteSession}
                />
            </Suspense>
        );
    } else {
        mainContent = (
            <div className="h-screen w-screen flex flex-col text-primary font-sans overflow-hidden">
                <header className="flex-shrink-0 p-4 flex justify-between items-center gap-4 border-b border-primary">
                    <div className="flex-1">
                        <Logo logoDataUrl={logoDataUrl} size={logoSize} />
                    </div>

                    <div className="hidden md:flex flex-1 justify-center items-center gap-6">
                        <Clock />
                        <SessionTimer startTime={sessionInfo!.startTime} />
                    </div>

                    <div className='flex flex-1 justify-end items-center gap-4'>
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
                <main className="flex-grow p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                    <TranscriptionPanel
                        history={transcriptionHistory}
                        anamnesis={anamnesis}
                        isAnamnesisLoading={isGeneratingAnamnesis}
                        sessionInfo={sessionInfo}
                        anamnesisMode={anamnesisMode}
                        onToggleAnamnesisMode={handleToggleAnamnesisMode}
                        onGenerateAnamnesis={handleGenerateAnamnesis}
                    />
                    <ControlsPanel
                        isListening={isListening}
                        statusMessage={statusMessage}
                        currentTranscription={[currentLiveTranscript]} // Passando o stream atual
                        onToggleListening={handleToggleListening}
                        isMuted={isMuted}
                        onToggleMute={handleToggleMute}
                        audioDevices={audioDevices}
                        selectedDeviceId={selectedDeviceId}
                        onDeviceChange={handleDeviceChange}
                        mediaStream={mediaStream}
                        waveformStyle={waveformStyle}
                        activeBufferIndex={0}
                    />
                    <InsightsPanel insights={insights} isLoading={isGeneratingInsights} activeInsightsProvider={activeInsightsProvider} />
                </main>
            </div>
        );
    }

    return (
        <>
            {mainContent}

            {isSettingsOpen && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <SettingsPanel
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        onSave={handleSaveSettings}
                        initialData={{
                            prompt: anamnesisPrompt,
                            theme,
                            logoUrl: logoDataUrl,
                            logoSize,
                            waveformStyle,
                            voiceName,
                            insightsProvider,
                            apiKeys,
                            gdrive: gdriveSettings,
                            selectedDeviceId
                        }}
                        audioDevices={audioDevices}
                        onResetPrompt={handleResetPrompt}
                        logs={logs}
                        onClearLogs={clearLogs}
                        lastError={lastError}
                        tokenStats={tokenStats}
                    />
                </Suspense>
            )}

            {isKnowledgePanelOpen && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <KnowledgePanel
                        isOpen={isKnowledgePanelOpen}
                        onClose={() => setIsKnowledgePanelOpen(false)}
                    />
                </Suspense>
            )}

            <button
                onClick={() => setIsKnowledgePanelOpen(true)}
                className="fixed bottom-6 left-6 z-40 p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 group"
                title="Base de Conhecimento"
            >
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                    Gerenciar Conhecimento
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
            </button>
            <SpeedInsights />
        </>
    );
};

export default App;