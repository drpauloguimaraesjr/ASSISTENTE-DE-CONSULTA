import React, { useRef, useEffect, useState } from 'react';

type Tab = 'transcription' | 'anamnesis';

interface SessionInfo {
    startTime: Date;
    location: GeolocationPosition | null;
}

interface TranscriptionPanelProps {
    history: string[];
    anamnesis: string;
    isAnamnesisLoading: boolean;
    sessionInfo: SessionInfo | null;
}

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
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

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ history, anamnesis, isAnamnesisLoading, sessionInfo }) => {
    const endOfContentRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<Tab>('transcription');

    useEffect(() => {
        endOfContentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, anamnesis, activeTab]);

    const handleExport = () => {
        const sessionHeader = `Sessão iniciada em: ${sessionInfo ? formatDate(sessionInfo.startTime) : 'N/A'}\n`;
        const locationHeader = `Localização: ${sessionInfo?.location ? `${sessionInfo.location.coords.latitude.toFixed(4)}, ${sessionInfo.location.coords.longitude.toFixed(4)}` : 'N/A'}\n\n`;
        const separator = "=".repeat(30) + "\n\n";
        const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
        
        let content = '';
        let filename = '';

        if (activeTab === 'transcription') {
            if (history.length === 0) return;
            const header = "Transcrição da Consulta\n";
            content = sessionHeader + locationHeader + header + separator + history.join('\n\n');
            filename = `transcricao-${timestamp}.txt`;
        } else { // 'anamnesis' tab
            if (!anamnesis) return;
            const header = "Anamnese da Consulta\n";
            content = sessionHeader + locationHeader + header + separator + anamnesis;
            filename = `anamnese-${timestamp}.txt`;
        }
    
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
    
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderTabContent = () => {
        if (activeTab === 'transcription') {
            return (
                <>
                    {history.length > 0 ? (
                        history.map((text, index) => (
                            <p key={index} className="mb-4 text-secondary whitespace-pre-wrap">
                                {text}
                            </p>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-tertiary">A transcrição aparecerá aqui.</p>
                        </div>
                    )}
                </>
            );
        }

        if (activeTab === 'anamnesis') {
            return (
                <>
                    {anamnesis ? (
                         <p className="text-secondary whitespace-pre-wrap">{anamnesis}</p>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-tertiary">A anamnese será gerada aqui.</p>
                        </div>
                    )}
                     {isAnamnesisLoading && (
                        <div className="flex items-center text-secondary mt-4">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 spinner-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Atualizando anamnese...</span>
                        </div>
                    )}
                </>
            )
        }
    };

    return (
        <div className="bg-panel rounded-lg p-6 flex flex-col border border-primary h-full overflow-hidden">
            <div className='flex-shrink-0'>
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-xl font-semibold text-accent">Registro da Sessão</h2>
                    <button
                        onClick={handleExport}
                        disabled={(activeTab === 'transcription' && history.length === 0) || (activeTab === 'anamnesis' && !anamnesis)}
                        className="flex items-center gap-2 px-3 py-1.5 btn-secondary text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus-ring focus:ring-opacity-75 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                        aria-label="Exportar"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span>Exportar</span>
                    </button>
                </div>
                {sessionInfo && (
                    <div className='text-xs text-secondary mb-4 border-b border-primary pb-3'>
                        <p>Início: {formatDate(sessionInfo.startTime)}</p>
                        <p>Local: {sessionInfo.location ? `${sessionInfo.location.coords.latitude.toFixed(4)}, ${sessionInfo.location.coords.longitude.toFixed(4)}` : 'Não disponível'}</p>
                    </div>
                )}
                 <div className="mb-4 border-b border-primary">
                    <nav className="flex -mb-px">
                        <button onClick={() => setActiveTab('transcription')} className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'transcription' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary hover:border-tertiary'}`}>
                            Transcrição Completa
                        </button>
                         <button onClick={() => setActiveTab('anamnesis')} className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'anamnesis' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary hover:border-tertiary'}`}>
                            Anamnese em Tempo Real
                        </button>
                    </nav>
                </div>
            </div>
           
            <div className="overflow-y-auto pr-2 flex-grow">
               {renderTabContent()}
                <div ref={endOfContentRef} />
            </div>
        </div>
    );
};