import React, { useRef, useEffect } from 'react';

interface InsightsPanelProps {
    insights: string[];
    isLoading: boolean;
}

const SparkleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5l1.55 4.75h4.95l-4 3.55 1.55 4.75L12 12.5l-4.05 3.05 1.55-4.75-4-3.55h4.95L12 2.5z" />
    </svg>
);


export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, isLoading }) => {
    const endOfInsightsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfInsightsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [insights]);

    return (
        <div className="bg-panel rounded-lg p-6 flex flex-col border border-primary h-full overflow-hidden">
            <h2 className="text-xl font-semibold text-accent mb-4 flex-shrink-0">Fluxo de Consciência (IA)</h2>
            <div className="overflow-y-auto pr-2 flex-grow">
                {insights.length > 0 ? (
                    insights.map((text, index) => (
                        <div key={index} className="flex items-start mb-4 animate-fade-in">
                            <SparkleIcon className="w-4 h-4 spinner-accent mt-1 mr-3 flex-shrink-0" />
                            <p className="text-secondary italic">{text}</p>
                        </div>
                    ))
                ) : (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-tertiary">Ideias e conclusões da IA aparecerão aqui.</p>
                    </div>
                )}
                {isLoading && (
                    <div className="flex items-center text-secondary mt-4">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 spinner-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Gerando insight...</span>
                    </div>
                )}
                 <div ref={endOfInsightsRef} />
            </div>
        </div>
    );
};