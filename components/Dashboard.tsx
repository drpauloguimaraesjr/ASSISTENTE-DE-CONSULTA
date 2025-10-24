import React, { useState } from 'react';
import { SessionData } from '../App';
import { Logo } from './Logo';
import { SessionExplorer } from './SessionExplorer';
import { DailySummary } from './DailySummary';
import { SessionViewerModal } from './SessionViewerModal';

interface DashboardProps {
    onStartSession: () => void;
    savedSessions: SessionData[];
    onOpenSettings: () => void;
    logoDataUrl: string | null;
    logoSize: number;
}

const SettingsIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
    </svg>
);

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession, savedSessions, onOpenSettings, logoDataUrl, logoSize }) => {
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

    return (
        <div className="h-screen w-screen flex flex-col text-primary p-4 font-sans">
            <header className="flex-shrink-0 pb-4 flex justify-between items-center">
                <Logo logoDataUrl={logoDataUrl} size={logoSize} />
                 <button 
                    onClick={onOpenSettings}
                    className="p-2 text-secondary hover:text-primary transition-colors"
                    aria-label="Abrir configurações"
                >
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                <div className="md:col-span-2 flex flex-col gap-4">
                    <div className="bg-panel rounded-lg p-6 flex flex-col justify-center items-start border border-primary">
                         <h1 className="text-3xl font-bold mb-2 text-primary">
                            Bem-vindo de volta!
                        </h1>
                        <p className="text-secondary mb-6">
                            Pronto para sua próxima consulta?
                        </p>
                        <button
                            onClick={onStartSession}
                            className="px-8 py-4 btn-primary text-white font-bold text-lg rounded-full transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus-ring focus:ring-opacity-50"
                        >
                            Iniciar Nova Sessão
                        </button>
                    </div>
                    <SessionExplorer sessions={savedSessions} onSessionSelect={setSelectedSession} />
                </div>
                <div className="md:col-span-1">
                    <DailySummary sessions={savedSessions} />
                </div>
            </main>
            {selectedSession && (
                <SessionViewerModal 
                    isOpen={!!selectedSession}
                    onClose={() => setSelectedSession(null)}
                    sessionData={selectedSession}
                />
            )}
        </div>
    );
};