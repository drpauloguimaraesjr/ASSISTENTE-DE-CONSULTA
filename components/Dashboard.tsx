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
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus-ring"
            >
                <img src={user.photoURL || undefined} alt="User avatar" className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user.displayName}</span>
            </button>
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-theme-lg py-1 z-50 dark:border-gray-800 dark:bg-gray-900">
                        <button
                            onClick={() => {
                                signOut();
                                setIsOpen(false);
                            }}
                            className="menu-item-inactive w-full text-left"
                        >
                            Sair
                        </button>
                    </div>
                </>
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
        <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-900 p-4 md:p-6 font-outfit">
            <header className="flex-shrink-0 pb-4 flex justify-between items-center">
                <Logo logoDataUrl={logoDataUrl} size={logoSize} />
                 <div className="flex items-center gap-3">
                    {user ? (
                        <UserMenu user={user} />
                    ) : (
                        <button
                            onClick={onLoginRequest}
                            className="btn btn-secondary"
                        >
                            Fazer Login / Salvar
                        </button>
                    )}
                     <button 
                        onClick={onOpenSettings}
                        className="relative flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white focus-ring"
                        aria-label="Abrir configurações"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
                <div className="md:col-span-2 flex flex-col gap-4 md:gap-6">
                    {isGuest && (
                        <div className="card border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10">
                            <div className="card-body flex items-start gap-3">
                                <InfoIcon className="w-5 h-5 flex-shrink-0 text-warning-600 dark:text-warning-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-warning-800 dark:text-warning-300">
                                        Você está no modo convidado. Suas sessões não serão salvas.{' '}
                                        <button 
                                            onClick={onLoginRequest} 
                                            className="font-semibold underline hover:text-warning-900 dark:hover:text-warning-200 transition-colors"
                                        >
                                            Faça login
                                        </button>{' '}
                                        para salvar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="card flex-grow flex flex-col justify-center items-start">
                        <div className="card-body w-full">
                            <h1 className="text-title-md font-bold mb-2 text-gray-800 dark:text-white/90">
                                {user ? `Bem-vindo de volta, ${user.displayName?.split(' ')[0]}!` : 'Bem-vindo!'}
                            </h1>
                            <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-6">
                                Pronto para sua próxima consulta?
                            </p>
                            <button
                                onClick={onStartSession}
                                className="btn btn-primary px-8 py-4 text-lg font-semibold rounded-xl hover:scale-105 transition-transform focus-ring"
                            >
                                Iniciar Nova Sessão
                            </button>
                        </div>
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