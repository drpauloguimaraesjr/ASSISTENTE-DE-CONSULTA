import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../App';

export type WaveformStyle = 'line' | 'bars';
export type InsightProvider = 'gemini' | 'openai' | 'grok';

export interface SettingsData {
    prompt: string;
    theme: Theme;
    logoUrl: string | null;
    logoSize: number;
    waveformStyle: WaveformStyle;
    insightsProvider: InsightProvider;
    apiKeys: {
        gemini: string; // Typically handled by env, but here for consistency
        openai: string;
        grok: string;
    }
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: SettingsData) => void;
    onResetPrompt: () => string; // Returns the default prompt
    initialSettings: SettingsData;
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

const insightProviders: { id: InsightProvider; name: string }[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'grok', name: 'Grok (xAI)' },
];


export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave, onResetPrompt, initialSettings }) => {
    const [settings, setSettings] = useState<SettingsData>(initialSettings);
    const [activeTab, setActiveTab] = useState<'prompt' | 'appearance' | 'apis'>('prompt');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSettings(initialSettings);
        }
    }, [initialSettings, isOpen]);

    const handleSave = () => {
        onSave(settings);
        onClose();
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
    
    if (!isOpen) {
        return null;
    }

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
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-secondary text-white font-bold rounded-md transition-colors"
                        >
                            <UploadIcon className="w-5 h-5"/>
                            Carregar Imagem
                        </button>
                        <button
                            onClick={() => setSettings(prev => ({...prev, logoUrl: null}))}
                            disabled={!settings.logoUrl}
                            className="w-full px-4 py-2 text-sm font-medium text-secondary rounded-md hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Remover Logo
                        </button>
                        <div className="mt-2">
                            <label htmlFor="logo-size" className="block text-sm font-medium text-secondary mb-2">
                                Tamanho da Logo: <span className="font-bold text-primary">{settings.logoSize}px</span>
                            </label>
                            <input
                                id="logo-size"
                                type="range"
                                min="16"
                                max="64"
                                value={settings.logoSize}
                                onChange={(e) => setSettings(prev => ({...prev, logoSize: parseInt(e.target.value, 10)}))}
                                className="w-full h-2 bg-primary/50 rounded-lg appearance-none cursor-pointer accent-accent"
                            />
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

            <div>
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
        </div>
    );

    const renderApisTab = () => (
        <div className='pt-6'>
            <div className="border-b border-primary pb-6 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Provedor de Insights</h3>
                <p className="text-sm text-secondary mb-4">
                    Escolha qual modelo de IA será usado para gerar o "Fluxo de Consciência".
                </p>
                <div className="flex flex-col sm:flex-row gap-2 rounded-lg bg-primary/50 p-1 border border-secondary w-full sm:w-auto">
                    {insightProviders.map(provider => (
                        <button
                            key={provider.id}
                            onClick={() => setSettings(prev => ({...prev, insightsProvider: provider.id}))}
                            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${settings.insightsProvider === provider.id ? 'bg-accent text-primary-bg' : 'text-secondary hover:bg-primary'}`}
                        >
                            {provider.name}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold mb-2 text-primary">Chaves de API</h3>
                 <p className="text-sm text-secondary mb-4">
                    Insira suas chaves de API para os serviços que deseja usar. A chave do Gemini é gerenciada pelo ambiente.
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="openai-key" className="block text-sm font-medium text-secondary mb-1">
                            Chave da API OpenAI
                        </label>
                        <input
                            id="openai-key"
                            type="password"
                            placeholder="sk-..."
                            value={settings.apiKeys.openai}
                            onChange={(e) => setSettings(prev => ({...prev, apiKeys: {...prev.apiKeys, openai: e.target.value}}))}
                            className="w-full bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent"
                        />
                    </div>
                     <div>
                        <label htmlFor="grok-key" className="block text-sm font-medium text-secondary mb-1">
                            Chave da API Grok (xAI)
                        </label>
                        <input
                            id="grok-key"
                            type="password"
                            placeholder="Chave da API..."
                            value={settings.apiKeys.grok}
                            onChange={(e) => setSettings(prev => ({...prev, apiKeys: {...prev.apiKeys, grok: e.target.value}}))}
                            className="w-full bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-panel-solid rounded-xl border border-primary w-full max-w-4xl max-h-[90vh] flex flex-col text-primary shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-primary flex-shrink-0">
                    <h2 className="text-xl font-bold text-accent">Configurações</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="px-6 pt-2 flex-grow overflow-y-auto">
                    <div className="border-b border-primary">
                        <nav className="flex -mb-px gap-4">
                            <button onClick={() => setActiveTab('prompt')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'prompt' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>
                                Prompt
                            </button>
                            <button onClick={() => setActiveTab('appearance')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'appearance' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>
                                Aparência
                            </button>
                             <button onClick={() => setActiveTab('apis')} className={`py-3 px-1 text-sm font-semibold border-b-2 ${activeTab === 'apis' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>
                                APIs
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'prompt' && renderPromptTab()}
                    {activeTab === 'appearance' && renderAppearanceTab()}
                    {activeTab === 'apis' && renderApisTab()}

                </main>

                <footer className="flex justify-between items-center p-4 border-t border-primary flex-shrink-0 gap-4">
                     <button
                        onClick={handleReset}
                        disabled={activeTab !== 'prompt'}
                        className="px-4 py-2 text-sm font-medium text-secondary rounded-md hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={activeTab !== 'prompt' ? 'Disponível apenas na aba de Prompt' : 'Restaurar prompt padrão'}
                    >
                        Restaurar Padrão
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 btn-primary text-white font-bold text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus-ring focus:ring-opacity-50"
                    >
                        Salvar e Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};