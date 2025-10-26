import React, { useState } from 'react';
import { SessionData } from '../App';
import { Logo } from './Logo';
import { SessionExplorer } from './SessionExplorer';
import { DailySummary } from './DailySummary';
import { SessionViewerModal } from './SessionViewerModal';
import { User } from 'firebase/auth';
import { signOut } from '../services/firebaseService';

interface DashboardProps {
    user: User | null;
    isGuest: boolean;
    onLoginRequest: () => void;
    onStartSession: () => void;
    savedSessions: SessionData[];
    onOpenSettings: () => void;
    logoDataUrl: string | null;
    logoSize: number;
    onDeleteSession: (sessionId: string) => void;
}

const UserMenu: React.FC<{user: User}> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
                <img src={user.photoURL || undefined} alt="User avatar" className="w-8 h-8 rounded-full" />
                <span className="hidden sm:block text-sm font-medium text-primary">{user.displayName}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-panel-solid rounded-md shadow-lg py-1 border border-primary z-10">
                    <button
                        onClick={signOut}
                        className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-primary/50 hover:text-primary"
                    >
                        Sair
                    </button>
                </div>
            )}
        </div>
    );
};

const SettingsIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24-.42-.12-.64l2 3.46c.12-.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
    </svg>
);

const InfoIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, isGuest, onLoginRequest, onStartSession, savedSessions, onOpenSettings, logoDataUrl, logoSize, onDeleteSession }) => {
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

    return (
        <div className="h-screen w-screen flex flex-col text-primary p-4 font-sans">
            <header className="flex-shrink-0 pb-4 flex justify-between items-center">
                <Logo logoDataUrl={logoDataUrl} size={logoSize} />
                 <div className="flex items-center gap-4">
                    {user ? (
                        <UserMenu user={user} />
                    ) : (
                        <button
                            onClick={onLoginRequest}
                            className="px-4 py-2 text-sm font-medium rounded-md btn-secondary text-white transition-colors"
                        >
                            Fazer Login / Salvar
                        </button>
                    )}
                     <button 
                        onClick={onOpenSettings}
                        className="p-2 text-secondary hover:text-primary transition-colors"
                        aria-label="Abrir configurações"
                    >
                        <SettingsIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                <div className="md:col-span-2 flex flex-col gap-4">
                    {isGuest && (
                        <div className="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded-lg text-sm text-yellow-200/90 flex items-center gap-3">
                            <InfoIcon className="w-5 h-5 flex-shrink-0" />
                            <span>Você está no modo convidado. Suas sessões não serão salvas. <button onClick={onLoginRequest} className="font-bold underline hover:text-white">Faça login</button> para salvar.</span>
                        </div>
                    )}
                    <div className="bg-panel rounded-lg p-6 flex flex-col justify-center items-start border border-primary flex-grow">
                         <h1 className="text-3xl font-bold mb-2 text-primary">
                            {user ? `Bem-vindo de volta, ${user.displayName?.split(' ')[0]}!` : 'Bem-vindo!'}
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
                    <SessionExplorer sessions={savedSessions} onSessionSelect={setSelectedSession} onDeleteSession={onDeleteSession} />
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