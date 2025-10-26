import React, { useState, useEffect, useRef } from 'react';
import { SessionData } from '../App';
import { getPatientName } from '../utils/sessionUtils';

type Tab = 'transcription' | 'anamnesis';

interface SessionViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionData: SessionData;
}

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const SessionViewerModal: React.FC<SessionViewerModalProps> = ({ isOpen, onClose, sessionData }) => {
    const [activeTab, setActiveTab] = useState<Tab>('transcription');
    const endOfContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('transcription');
        }
    }, [isOpen]);

    useEffect(() => {
        endOfContentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessionData, activeTab]);

     if (!isOpen) {
        return null;
    }
    
    const renderTabContent = () => {
        if (activeTab === 'transcription') {
            return (
                sessionData.transcriptionHistory.map((text, index) => (
                    <p key={index} className="mb-4 text-secondary whitespace-pre-wrap">
                        {text}
                    </p>
                ))
            );
        }

        if (activeTab === 'anamnesis') {
            return (
                <p className="text-secondary whitespace-pre-wrap">{sessionData.anamnesis}</p>
            );
        }
    };

    const patientName = getPatientName(sessionData.anamnesis);

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
                    <h2 className="text-xl font-bold text-accent truncate">
                        Detalhes da Sessão{patientName && `: ${patientName}`}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 flex-grow overflow-y-auto">
                     <div className='text-xs text-secondary mb-4 border-b border-primary pb-3'>
                        <p><strong>Início:</strong> {formatDate(sessionData.startTime)}</p>
                        <p><strong>Fim:</strong> {formatDate(sessionData.endTime)}</p>
                        <p><strong>Local:</strong> {sessionData.location ? `${sessionData.location.coords.latitude.toFixed(4)}, ${sessionData.location.coords.longitude.toFixed(4)}` : 'Não disponível'}</p>
                    </div>

                    <div className="mb-4 border-b border-primary">
                        <nav className="flex -mb-px">
                            <button onClick={() => setActiveTab('transcription')} className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'transcription' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary hover:border-tertiary'}`}>
                                Transcrição Completa
                            </button>
                            <button onClick={() => setActiveTab('anamnesis')} className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'anamnesis' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary hover:border-tertiary'}`}>
                                Anamnese
                            </button>
                        </nav>
                    </div>

                    <div className="overflow-y-auto pr-2">
                        {renderTabContent()}
                        <div ref={endOfContentRef} />
                    </div>
                </main>

                 <footer className="flex justify-end items-center p-4 border-t border-primary flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 btn-primary text-white font-bold text-sm rounded-md transition-colors"
                    >
                        Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};