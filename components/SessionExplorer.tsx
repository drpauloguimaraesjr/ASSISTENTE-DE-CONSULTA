import React, { useState } from 'react';
import { SessionData } from '../App';
import { getPatientName } from '../utils/sessionUtils';

interface SessionExplorerProps {
    sessions: SessionData[];
    onSessionSelect: (session: SessionData) => void;
    onDeleteSession: (sessionId: string) => void;
}

const FolderIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.9-2-2-2h-8l-2-2z"/></svg>
);

const FileIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
);

const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
);

const groupSessionsByDate = (sessions: SessionData[]): Record<string, SessionData[]> => {
    return sessions.reduce((acc, session) => {
        const dateKey = new Date(session.startTime).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(session);
        return acc;
    }, {} as Record<string, SessionData[]>);
};

export const SessionExplorer: React.FC<SessionExplorerProps> = ({ sessions, onSessionSelect, onDeleteSession }) => {
    const groupedSessions = groupSessionsByDate(sessions);
    const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
       // Convert pt-BR date string "dd de MMMM de yyyy" to something Date can parse
       const dateA = new Date(groupedSessions[a][0].startTime);
       const dateB = new Date(groupedSessions[b][0].startTime);
       return dateB.getTime() - dateA.getTime();
    });

    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        if (sortedDates.length > 0) {
            initialState[sortedDates[0]] = true; // Open the most recent day by default
        }
        return initialState;
    });

    const toggleFolder = (date: string) => {
        setOpenFolders(prev => ({ ...prev, [date]: !prev[date] }));
    };

    return (
        <div className="bg-panel rounded-lg p-6 flex flex-col border border-primary h-full overflow-hidden flex-grow">
            <h2 className="text-xl font-semibold text-accent mb-4 flex-shrink-0">Histórico de Sessões</h2>
            <div className="overflow-y-auto pr-2 flex-grow">
                {sortedDates.length > 0 ? (
                    sortedDates.map(date => (
                        <div key={date} className="mb-2">
                            <button 
                                onClick={() => toggleFolder(date)}
                                className="w-full flex items-center p-2 rounded-md hover:bg-primary/50 transition-colors text-left"
                            >
                                <ChevronDownIcon className={`w-5 h-5 mr-2 text-secondary transition-transform ${openFolders[date] ? 'rotate-180' : ''}`} />
                                <FolderIcon className="w-5 h-5 mr-2 text-accent" />
                                <span className="font-semibold text-primary">{date}</span>
                            </button>
                            {openFolders[date] && (
                                <ul className="pl-8 mt-1 border-l-2 border-secondary/50">
                                    {groupedSessions[date]
                                        .sort((a,b) => b.startTime.getTime() - a.startTime.getTime())
                                        .map(session => {
                                            const patientName = getPatientName(session.anamnesis);
                                            return (
                                                <li key={session.id} className="group flex justify-between items-center rounded-md hover:bg-primary/50">
                                                    <button 
                                                        onClick={() => onSessionSelect(session)}
                                                        className="flex-grow flex items-center p-2 text-left transition-colors"
                                                    >
                                                        <FileIcon className="w-5 h-5 mr-2 text-tertiary" />
                                                        <span className="text-secondary text-sm truncate">
                                                            {session.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            <span className="text-tertiary mx-2">-</span>
                                                            <span className="text-primary font-medium">{patientName || 'Sessão Rápida'}</span>
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Tem certeza de que deseja apagar esta sessão? Esta ação não pode ser desfeita.')) {
                                                                onDeleteSession(session.id);
                                                            }
                                                        }}
                                                        className="p-2 rounded-full text-tertiary hover:text-button-danger-hover hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        aria-label="Apagar sessão"
                                                        title="Apagar sessão"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            );
                                    })}
                                </ul>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-tertiary">Nenhuma sessão salva ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
};