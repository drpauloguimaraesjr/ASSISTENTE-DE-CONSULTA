import { useState, useCallback } from 'react';

export interface LogEntry {
    timestamp: Date;
    type: 'INFO' | 'ERROR' | 'WARN' | 'API';
    message: string;
}

export const useLogger = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const log = useCallback((type: LogEntry['type'], message: string) => {
        const newEntry: LogEntry = {
            timestamp: new Date(),
            type,
            message,
        };
        setLogs(prevLogs => [...prevLogs, newEntry]);
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, log, clearLogs };
};
