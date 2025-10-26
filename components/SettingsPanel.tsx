import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../App';
import { LogEntry } from '../hooks/useLogger';
import { LogViewer } from './LogViewer';
import { GoogleDriveSettings } from './GoogleDriveSettings';
import { GDriveSettings } from '../services/googleDriveService';
import { validateOpenAIApiKey, validateGrokApiKey } from '../services/apiValidationService';
import { firebaseConfigPlaceholder } from '../services/firebaseService';

export type WaveformStyle = 'line' | 'bars';
export type InsightProvider = 'gemini' | 'openai' | 'grok';
export type PrebuiltVoice = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';


export interface SettingsData {
    prompt: string;
    theme: Theme;
    logoUrl: string | null;
    logoSize: number;
    waveformStyle: WaveformStyle;
    voiceName: PrebuiltVoice;
    insightsProvider: InsightProvider;
    apiKeys: {
        gemini: string;
        openai: string;
        grok: string;
    };
    gdrive: GDriveSettings;
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: SettingsData) => void;
    onResetPrompt: () => string;
    initialSettings: SettingsData;
    logs: LogEntry[];
    onClearLogs: () => void;
}

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error';
interface ApiValidationState {
    openai: { status: ValidationStatus; message: string };
    grok: { status: ValidationStatus; message: string };
}


const PLAUS_NOTE_REFERENCE = `Este é um exemplo de um prompt de anamnese detalhado que você pode usar como base para criar o seu.

---
[NOME DO PACIENTE]
(escreva o nome do paciente conforme sea detectado no audio)

[QUEIXA PRINCIPAL]
(descreva com as palavras do paciente)
... (restante do prompt de referência)
---`;

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
    </svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ExclamationCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


const themes: { id: Theme; name: string; colors: string[] }[] = [
    { id: 'default', name: 'Padrão', colors: ['#3b82f6', '#6366f1'] },
    { id: 'matrix', name: 'Matrix', colors: ['#00ff00', '#00aa00'] },
    { id: 'dusk', name: 'Crepúsculo', colors: ['#a855f7', '#ec4899'] },
    { id: 'light', name: 'Claro', colors: ['#2563eb', '#0ea5e9'] },
];

const waveformStyles: { id: WaveformStyle; name: string }[] = [
    { id: 'line', name: 'Linha' },
    { id: 'bars', name: 'Barras' },
];

const voices: { id: PrebuiltVoice; name: string }[] = [
    { id: 'Zephyr', name: 'Zephyr (Padrão)' },
    { id: 'Puck', name: 'Puck' },
    { id: 'Charon', name: 'Charon' },
    { id: 'Kore', name: 'Kore' },
    { id: 'Fenrir', name: 'Fenrir' },
];

const insightProviders: { id: InsightProvider; name: string }[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'grok', name: 'Grok (xAI)' },
];


export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave, onResetPrompt, initialSettings, logs, onClearLogs }) => {
    const [settings, setSettings] = useState<SettingsData>(initialSettings);
    const [activeTab, setActiveTab] = useState<'firebase' | 'prompt' | 'appearance' | 'apis' | 'integrations' | 'diagnostics'>('firebase');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [validationStatus, setValidationStatus] = useState<ApiValidationState>({
        openai: { status: 'idle', message: '' },
        grok: { status: 'idle', message: '' },
    });
    const [copyStatus, setCopyStatus] = useState('Copiar');

    useEffect(() => {
        if (isOpen) {
            setSettings(initialSettings);
            setValidationStatus({
                openai: { status: 'idle', message: '' },
                grok: { status: 'idle', message: '' },
            });
        }
    }, [initialSettings, isOpen]);

    const handleSave = () => {
        try {
            onSave(settings);
        } finally {
            onClose();
        }
    };

    const handleReset = () => {
        const defaultPrompt = onResetPrompt();
        setSettings(prev => ({...prev, prompt: defaultPrompt}));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({...prev, logoUrl: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    };

     const handleTestApiKey = async (provider: 'openai' | 'grok') => {
        const key = settings.apiKeys[provider];
        if (!key) {
            setValidationStatus(prev => ({...prev, [provider]: { status: 'error', message: 'A chave de API não pode estar vazia.' }}));
            return;
        }
        setValidationStatus(prev => ({ ...prev, [provider]: { status: 'loading', message: '' } }));
        try {
            const isValid = provider === 'openai' ? await validateOpenAIApiKey(key) : await validateGrokApiKey(key);
            if (isValid) {
                setValidationStatus(prev => ({ ...prev, [provider]: { status: 'success', message: 'Sucesso!' } }));
            } else {
                 throw new Error("Chave de API inválida ou expirada.");
            }
        } catch (error: any) {
             setValidationStatus(prev => ({...prev, [provider]: { status: 'error', message: error.message || 'Falha no teste.' }}));
        }
    };
    
     const handleCopyConfig = () => {
        const configText = JSON.stringify(firebaseConfigPlaceholder, null, 2);
        navigator.clipboard.writeText(configText).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar'), 2000);
        });
    };

    if (!isOpen) return null;

    const renderFirebaseTab = () => (
        <div className="pt-6 space-y-6">
            <div className="p-4 rounded-lg bg-yellow-900/30 border border-yellow-700/50 flex items-start gap-3">
                <ExclamationCircleIcon className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-lg font-semibold text-yellow-200">Ação Necessária: Configurar o Firebase</h3>
                    <p className="text-sm text-yellow-200/90 mt-1">
                        Para salvar seus dados de forma segura, este aplicativo agora usa o Firebase. Você precisa criar um projeto gratuito no Firebase e adicionar suas chaves de configuração ao código do aplicativo.
                    </p>
                </div>
            </div>
            
            <div className='space-y-4'>
                 <h4 className="text-lg font-semibold text-primary">Passo a Passo</h4>
                 <ol className="list-decimal list-inside text-sm text-secondary space-y-3">
                    <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">Console do Firebase</a> e clique em "Adicionar projeto".</li>
                    <li>Siga as instruções para criar um novo projeto (você pode desativar o Google Analytics).</li>
                    <li>No painel do seu novo projeto, clique no ícone de engrenagem ao lado de "Visão geral do projeto" e vá para <strong className="text-primary">Configurações do projeto</strong>.</li>
                    <li>Na aba "Geral", role para baixo até "Seus aplicativos" e clique no ícone da web <strong className="text-primary">(&lt;/&gt;)</strong> para registrar um novo aplicativo da Web. Dê um apelido (ex: "Assistente de Consulta").</li>
                    <li>Após o registro, o Firebase exibirá um objeto de configuração. Copie este objeto.</li>
                    <li>
                        Abra o arquivo <code className="text-xs bg-primary/80 px-1 py-0.5 rounded">services/firebaseService.ts</code> no editor de código.
                    </li>
                    <li>
                        Localize a constante <code className="text-xs bg-primary/80 px-1 py-0.5 rounded">firebaseConfigPlaceholder</code> e <strong className="text-accent">substitua todo o seu conteúdo</strong> pelo objeto de configuração que você copiou do Firebase.
                    </li>
                    <li>
                        De volta ao console do Firebase, no menu à esquerda, vá para <strong className="text-primary">Authentication</strong>. Clique em "Começar" e, na aba "Sign-in method", ative o provedor <strong className="text-primary">Google</strong>.
                    </li>
                     <li>
                        No menu, vá para <strong className="text-primary">Cloud Firestore</strong>. Clique em "Criar banco de dados", inicie em <strong className="text-primary">modo de produção</strong> e escolha um local para os servidores.
                    </li>
                     <li>Salve o arquivo e recarregue o aplicativo. Se tudo estiver correto, a tela de login desaparecerá e você poderá usar o app.</li>
                </ol>
            </div>

            <div>
                 <h4 className="text-lg font-semibold text-primary mb-2">Objeto de Configuração de Exemplo</h4>
                <div className="bg-primary/50 border border-secondary rounded-md p-4 text-sm font-mono whitespace-pre-wrap relative">
                    <button onClick={handleCopyConfig} className="absolute top-2 right-2 text-xs font-semibold text-primary bg-slate-600/50 px-2 py-1 rounded hover:bg-slate-500/50">{copyStatus}</button>
                    <code className='text-tertiary'>{JSON.stringify(firebaseConfigPlaceholder, null, 2)}</code>
                </div>
            </div>
        </div>
    );

    const renderPromptTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Seu Prompt de Anamnese</h3>
                <p className="text-sm text-secondary mb-4">
                    Edite o texto abaixo para definir como a IA deve estruturar a anamnese.
                </p>
                <textarea
                    value={settings.prompt}
                    onChange={(e) => setSettings(prev => ({...prev, prompt: e.target.value}))}
                    className="w-full h-96 bg-primary border border-secondary rounded-md p-3 text-sm font-mono focus:ring-2 focus-ring focus:border-accent transition-colors resize-y"
                    placeholder="Digite seu prompt aqui..."
                />
            </div>
             <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Referência de Prompt</h3>
                 <p className="text-sm text-secondary mb-4">
                    Use este exemplo como inspiração.
                </p>
                <div className="bg-primary/50 border border-primary rounded-md p-4 text-sm text-secondary whitespace-pre-wrap h-96 overflow-y-auto">
                   {PLAUS_NOTE_REFERENCE}
                </div>
            </div>
        </div>
    );

    const renderAppearanceTab = () => (
        <div className='pt-6'>
             <div className="border-b border-primary pb-6 mb-6">
                 <h3 className="text-lg font-semibold mb-2 text-primary">Tema Visual</h3>
                <p className="text-sm text-secondary mb-4">
                    Escolha a aparência do aplicativo.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {themes.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => setSettings(prev => ({...prev, theme: theme.id}))}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.theme === theme.id ? 'border-accent' : 'border-primary hover:border-secondary'}`}
                        >
                            <div className="flex justify-center items-center gap-2 mb-2">
                                {theme.colors.map(color => (
                                    <div key={color} className="w-6 h-6 rounded-full" style={{ backgroundColor: color }}></div>
                                ))}
                            </div>
                            <p className={`text-sm font-medium ${settings.theme === theme.id ? 'text-primary' : 'text-secondary'}`}>{theme.name}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-b border-primary pb-6 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Logomarca</h3>
                <p className="text-sm text-secondary mb-4">
                   Faça o upload de um arquivo de imagem (PNG, JPG, etc.) para usar como sua logo.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-secondary text-white font-bold rounded-md transition-colors">
                            <UploadIcon className="w-5 h-5"/>
                            Carregar Imagem
                        </button>
                        <button onClick={() => setSettings(prev => ({...prev, logoUrl: null}))} disabled={!settings.logoUrl} className="w-full px-4 py-2 text-sm font-medium text-secondary rounded-md hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Remover Logo
                        </button>
                        <div className="mt-2">
                            <label htmlFor="logo-size" className="block text-sm font-medium text-secondary mb-2">
                                Tamanho da Logo: <span className="font-bold text-primary">{settings.logoSize}px</span>
                            </label>
                            <input id="logo-size" type="range" min="16" max="64" value={settings.logoSize} onChange={(e) => setSettings(prev => ({...prev, logoSize: parseInt(e.target.value, 10)}))} className="w-full h-2 bg-primary/50 rounded-lg appearance-none cursor-pointer accent-accent" />
                        </div>
                    </div>
                     <div className="flex flex-col items-center justify-center bg-primary/50 border border-primary rounded-md p-4 min-h-[150px]">
                        <span className="text-sm text-secondary mb-2">Pré-visualização:</span>
                        <div className="bg-gradient-accent p-2 rounded-lg flex items-center justify-center">
                           {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Pré-visualização da Logo" className="object-contain" style={{ width: `${settings.logoSize}px`, height: `${settings.logoSize}px` }} />
                           ) : (
                                <div className="flex items-center justify-center" style={{ width: `${settings.logoSize}px`, height: `${settings.logoSize}px` }}>
                                     <p className='text-xs text-center text-primary-bg/70'>Sem logo</p>
                                </div>
                           )}
                        </div>
                    </div>
                </div>
            </div>
             <div className="border-b border-primary pb-6 mb-6">
                 <h3 className="text-lg font-semibold mb-2 text-primary">Estilo da Onda Sonora</h3>
                 <p className="text-sm text-secondary mb-4">
                    Escolha o formato do visualizador de áudio durante a gravação.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {waveformStyles.map(style => (
                        <button
                            key={style.id}
                            onClick={() => setSettings(prev => ({...prev, waveformStyle: style.id}))}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${settings.waveformStyle === style.id ? 'border-accent' : 'border-primary hover:border-secondary'}`}
                        >
                             <p className={`text-sm font-medium ${settings.waveformStyle === style.id ? 'text-primary' : 'text-secondary'}`}>{style.name}</p>
                        </button>
                    ))}
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Voz da Assistente</h3>
                <p className="text-sm text-secondary mb-4">
                    Escolha a voz que a assistente de IA usará para responder.
                </p>
                <select 
                    value={settings.voiceName}
                    onChange={(e) => setSettings(prev => ({...prev, voiceName: e.target.value as PrebuiltVoice}))}
                    className="w-full max-w-xs bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent transition-colors"
                >
                    {voices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                            {voice.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    const ApiKeyInput = ({ provider, label, placeholder }: { provider: 'openai' | 'grok', label: string, placeholder: string }) => {
        const { status, message } = validationStatus[provider];
        let statusIndicator = null;
        if (status === 'loading') {
            statusIndicator = <svg className="animate-spin h-5 w-5 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        } else if (status === 'success') {
            statusIndicator = <CheckCircleIcon className="h-5 w-5 text-green-400" />;
        } else if (status === 'error') {
            statusIndicator = <ExclamationCircleIcon className="h-5 w-5 text-red-400" />;
        }
        return (
            <div>
                <label htmlFor={`${provider}-key`} className="block text-sm font-medium text-secondary mb-1">{label}</label>
                <div className="flex items-center gap-2">
                    <input
                        id={`${provider}-key`}
                        type="password"
                        placeholder={placeholder}
                        value={settings.apiKeys[provider]}
                        onChange={(e) => {
                            setSettings(prev => ({...prev, apiKeys: {...prev.apiKeys, [provider]: e.target.value}}));
                            setValidationStatus(prev => ({ ...prev, [provider]: { status: 'idle', message: '' }}));
                        }}
                        className="flex-grow bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent"
                    />
                    <button onClick={() => handleTestApiKey(provider)} disabled={status === 'loading'} className="px-4 py-2 text-sm font-semibold text-primary bg-primary/50 border border-secondary rounded-md hover:bg-primary transition-colors disabled:opacity-50">Testar</button>
                    <div className="w-5 h-5">{statusIndicator}</div>
                </div>
                 {message && <p className={`text-xs mt-1 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
            </div>
        );
    };

    const renderApisTab = () => (
        <div className='pt-6'>
            <div className="border-b border-primary pb-6 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Provedor de Insights</h3>
                <p className="text-sm text-secondary mb-4">
                    Escolha qual modelo de IA será usado para gerar o "Fluxo de Consciência".
                </p>
                <div className="flex flex-col sm:flex-row gap-2 rounded-lg bg-primary/50 p-1 border border-secondary w-full sm:w-auto">
                    {insightProviders.map(provider => (
                        <button key={provider.id} onClick={() => setSettings(prev => ({...prev, insightsProvider: provider.id}))} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${settings.insightsProvider === provider.id ? 'bg-accent text-primary-bg' : 'text-secondary hover:bg-primary'}`}>
                            {provider.name}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold mb-2 text-primary">Chaves de API</h3>
                 <p className="text-sm text-secondary mb-4">
                    Insira e teste suas chaves de API. A chave do Gemini é gerenciada pelo ambiente do aplicativo.
                </p>
                <div className="space-y-6">
                   <ApiKeyInput provider="openai" label="Chave da API OpenAI" placeholder="sk-..." />
                   <ApiKeyInput provider="grok" label="Chave da API Grok (xAI)" placeholder="Chave da API..." />
                </div>
            </div>
        </div>
    );

    const renderIntegrationsTab = () => (
        <div className='pt-6'>
            <GoogleDriveSettings settings={settings.gdrive} onSettingsChange={(gdriveSettings) => setSettings(prev => ({...prev, gdrive: gdriveSettings }))} />
        </div>
    );

    const renderDiagnosticsTab = () => (
        <div className='pt-6'>
             <LogViewer logs={logs} onClearLogs={onClearLogs} />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-panel-solid rounded-xl border border-primary w-full max-w-4xl max-h-[90vh] flex flex-col text-primary shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-primary flex-shrink-0">
                    <h2 className="text-xl font-bold text-accent">Configurações</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors"><CloseIcon className="w-6 h-6" /></button>
                </header>

                <main className="px-6 pt-2 flex-grow overflow-y-auto">
                    <div className="border-b border-primary">
                        <nav className="flex -mb-px gap-4 flex-wrap">
                            <button onClick={() => setActiveTab('firebase')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'firebase' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>Firebase</button>
                            <button onClick={() => setActiveTab('prompt')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'prompt' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>Prompt</button>
                            <button onClick={() => setActiveTab('appearance')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'appearance' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>Aparência</button>
                            <button onClick={() => setActiveTab('apis')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'apis' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>APIs</button>
                            <button onClick={() => setActiveTab('integrations')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'integrations' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>Integrações</button>
                            <button onClick={() => setActiveTab('diagnostics')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'diagnostics' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>Diagnóstico</button>
                        </nav>
                    </div>

                    {activeTab === 'firebase' && renderFirebaseTab()}
                    {activeTab === 'prompt' && renderPromptTab()}
                    {activeTab === 'appearance' && renderAppearanceTab()}
                    {activeTab === 'apis' && renderApisTab()}
                    {activeTab === 'integrations' && renderIntegrationsTab()}
                    {activeTab === 'diagnostics' && renderDiagnosticsTab()}

                </main>

                <footer className="flex justify-between items-center p-4 border-t border-primary flex-shrink-0 gap-4">
                     <button onClick={handleReset} disabled={activeTab !== 'prompt'} className="px-4 py-2 text-sm font-medium text-secondary rounded-md hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={activeTab !== 'prompt' ? 'Disponível apenas na aba de Prompt' : 'Restaurar prompt padrão'}>
                        Restaurar Padrão
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 btn-primary text-white font-bold text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus-ring focus:ring-opacity-50">
                        Salvar e Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};