import React, { useState } from 'react';
import { SessionData } from '../App';
import { generateDailySummary } from '../services/geminiService';

interface DailySummaryProps {
    sessions: SessionData[];
}

const isToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

const LightbulbIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm-1-4.1c-1.88 0-3.4-1.52-3.4-3.4 0-1.55 1.05-2.85 2.5-3.23V9.5h1.8v-2.23c1.45.38 2.5 1.68 2.5 3.23 0 1.88-1.52 3.4-3.4 3.4z"/></svg>
);


export const DailySummary: React.FC<DailySummaryProps> = ({ sessions }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState('');
    const [error, setError] = useState('');

    const todaySessions = sessions.filter(s => isToday(s.startTime));

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setSummary('');
        try {
            const transcripts = todaySessions.flatMap(s => s.transcriptionHistory);
            const result = await generateDailySummary(transcripts);
            setSummary(result);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-panel rounded-lg p-6 flex flex-col border border-primary h-full overflow-hidden">
            <h2 className="text-xl font-semibold text-accent mb-4 flex-shrink-0">Insights do Dia</h2>
            <div className="overflow-y-auto pr-2 flex-grow">
                {summary && (
                    <div className="text-secondary text-sm whitespace-pre-wrap animate-fade-in" dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>').replace(/\n/g, '<br />') }} />
                )}
                 {!summary && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <LightbulbIcon className="w-12 h-12 text-tertiary mb-4" />
                        <h3 className="text-lg font-semibold text-primary">Ideias para Conteúdo</h3>
                        <p className="text-tertiary text-sm mt-2">
                           {todaySessions.length > 0
                                ? `Você tem ${todaySessions.length} consulta(s) hoje. Clique abaixo para gerar temas para suas redes sociais.`
                                : `Nenhuma consulta registrada hoje. Conclua uma sessão para gerar insights.`
                            }
                        </p>
                    </div>
                )}
                {isLoading && (
                     <div className="flex items-center text-secondary">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 spinner-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Analisando e gerando ideias...</span>
                    </div>
                )}
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
             <div className="pt-4 mt-auto flex-shrink-0">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || todaySessions.length === 0}
                    className="w-full px-6 py-3 btn-secondary text-white font-bold text-base rounded-md transition-colors focus:outline-none focus:ring-2 focus-ring focus:ring-opacity-50 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    title={
                        isLoading 
                        ? "Aguarde, gerando ideias..." 
                        : todaySessions.length === 0 
                        ? "Adicione uma sessão hoje para ativar esta função." 
                        : "Gerar ideias de conteúdo com base nas sessões de hoje"
                    }
                >
                    {isLoading ? 'Gerando...' : 'Gerar Ideias'}
                </button>
            </div>
        </div>
    );
};