import React, { useState } from 'react';
import { LogEntry } from '../hooks/useLogger';

interface LogViewerProps {
    logs: LogEntry[];
    onClearLogs: () => void;
}

const getLogTypeClass = (type: LogEntry['type']) => {
    switch (type) {
        case 'ERROR': return 'text-red-400';
        case 'WARN': return 'text-yellow-400';
        case 'API': return 'text-sky-400';
        case 'INFO':
        default:
            return 'text-secondary';
    }
};

const CopyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
);

const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
);


export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
    const [copyStatus, setCopyStatus] = useState('Copiar Logs');

    const handleCopy = () => {
        const logText = logs
            .map(log => `[${log.timestamp.toISOString()}] [${log.type}] ${log.message}`)
            .join('\n');
        
        navigator.clipboard.writeText(logText).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar Logs'), 2000);
        }, () => {
            setCopyStatus('Falha ao copiar');
            setTimeout(() => setCopyStatus('Copiar Logs'), 2000);
        });
    };

    return (
        <div>
            <div className='flex justify-between items-center mb-4'>
                <div>
                    <h3 className="text-lg font-semibold text-primary">Logs de Diagnóstico</h3>
                    <p className="text-sm text-secondary">
                        Eventos do sistema para ajudar a identificar problemas.
                    </p>
                </div>
                <div className="flex gap-2">
                     <button
                        onClick={onClearLogs}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-600/50 hover:bg-slate-500/50 text-secondary text-xs font-medium rounded-md transition-colors"
                        title="Limpar Logs"
                    >
                        <TrashIcon className="w-4 h-4" />
                        <span>Limpar</span>
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 btn-secondary text-white text-xs font-medium rounded-md transition-colors"
                        title="Copiar para área de transferência"
                    >
                        <CopyIcon className="w-4 h-4" />
                        <span>{copyStatus}</span>
                    </button>
                </div>
            </div>
            <div className="bg-primary/50 border border-secondary rounded-md p-4 h-96 overflow-y-auto font-mono text-xs">
                {logs.length > 0 ? (
                    logs.map((log, index) => (
                        <div key={index} className="flex gap-4 items-start">
                            <span className="text-tertiary flex-shrink-0">{log.timestamp.toLocaleTimeString('pt-BR', { hour12: false })}</span>
                            <span className={`font-bold flex-shrink-0 w-12 ${getLogTypeClass(log.type)}`}>[{log.type}]</span>
                            <p className={`whitespace-pre-wrap break-words ${getLogTypeClass(log.type)}`}>{log.message}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-tertiary">Nenhum log registrado ainda. Inicie uma sessão para começar.</p>
                )}
            </div>
        </div>
    );
};
