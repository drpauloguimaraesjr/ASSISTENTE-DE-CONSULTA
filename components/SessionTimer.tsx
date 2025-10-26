import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
    startTime: Date;
}

const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

export const SessionTimer: React.FC<SessionTimerProps> = ({ startTime }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [targetDurationMinutes, setTargetDurationMinutes] = useState(() => {
        const savedDuration = localStorage.getItem('targetSessionDuration');
        return savedDuration ? parseInt(savedDuration, 10) : 30; // Padrão de 30 minutos
    });

    useEffect(() => {
        const timerId = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setElapsedSeconds(elapsed);
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, [startTime]);

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDuration = parseInt(e.target.value, 10);
        if (!isNaN(newDuration) && newDuration > 0) {
            setTargetDurationMinutes(newDuration);
            localStorage.setItem('targetSessionDuration', newDuration.toString());
        }
    };

    const hasExceededTime = elapsedSeconds >= targetDurationMinutes * 60;

    return (
        <div className="flex items-center gap-3 bg-panel px-3 py-1.5 rounded-lg border border-primary">
            <div className={`font-mono text-lg ${hasExceededTime ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                {formatTime(elapsedSeconds)}
            </div>
            <div className="text-secondary">/</div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={targetDurationMinutes}
                    onChange={handleDurationChange}
                    className="w-16 bg-primary/50 border border-secondary rounded-md p-1 text-sm text-center font-mono focus:ring-1 focus-ring focus:border-accent"
                    min="1"
                />
                <span className="text-sm text-secondary">min</span>
            </div>
        </div>
    );
};
