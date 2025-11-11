// Token tracking service para monitorar uso de tokens do Gemini

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface TokenStats {
    corrections: TokenUsage;
    insights: TokenUsage;
    anamnesis: TokenUsage;
    total: TokenUsage;
    callCount: {
        corrections: number;
        insights: number;
        anamnesis: number;
    };
}

class TokenTrackerService {
    private stats: TokenStats = {
        corrections: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        insights: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        anamnesis: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        total: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        callCount: {
            corrections: 0,
            insights: 0,
            anamnesis: 0,
        }
    };

    // Extrai tokens da resposta do Gemini
    extractTokensFromResponse(response: any): TokenUsage {
        try {
            // O GoogleGenAI SDK pode retornar usage em diferentes formatos
            let usage = null;
            
            // Tenta acessar diretamente
            if (response.usage) {
                usage = response.usage;
            } 
            // Tenta via response (se for uma resposta encapsulada)
            else if (response.response?.usage) {
                usage = response.response.usage;
            }
            // Tenta via candidatos
            else if ((response as any).candidates?.[0]?.usage) {
                usage = (response as any).candidates[0].usage;
            }
            // Tenta via resposta do modelo
            else if ((response as any).modelResponse?.usage) {
                usage = (response as any).modelResponse.usage;
            }
            // Tenta acessar via propriedades diretas
            else if ((response as any).promptTokens !== undefined || (response as any).candidatesTokens !== undefined) {
                usage = response;
            }

            if (!usage) {
                // Se não encontrou, tenta estimar baseado no texto (aprox 1 token = 4 caracteres)
                const promptText = (response.contents?.[0]?.parts?.[0]?.text || '').length;
                const responseText = (response.text || '').length;
                return {
                    promptTokens: Math.ceil(promptText / 4),
                    completionTokens: Math.ceil(responseText / 4),
                    totalTokens: Math.ceil((promptText + responseText) / 4)
                };
            }

            return {
                promptTokens: usage.promptTokens || usage.inputTokens || usage.requestTokenCount || 0,
                completionTokens: usage.completionTokens || usage.candidatesTokens || usage.outputTokens || usage.responseTokenCount || 0,
                totalTokens: usage.totalTokens || usage.totalTokenCount || ((usage.promptTokens || usage.inputTokens || usage.requestTokenCount || 0) + (usage.completionTokens || usage.candidatesTokens || usage.outputTokens || usage.responseTokenCount || 0))
            };
        } catch (error) {
            console.warn('Erro ao extrair tokens:', error);
            // Fallback: estima baseado no texto
            try {
                const promptText = (response.contents?.[0]?.parts?.[0]?.text || '').length;
                const responseText = (response.text || '').length;
                return {
                    promptTokens: Math.ceil(promptText / 4),
                    completionTokens: Math.ceil(responseText / 4),
                    totalTokens: Math.ceil((promptText + responseText) / 4)
                };
            } catch {
                return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            }
        }
    }

    // Registra uso de tokens para correção de transcrição
    recordCorrection(usage: TokenUsage) {
        this.stats.corrections.promptTokens += usage.promptTokens;
        this.stats.corrections.completionTokens += usage.completionTokens;
        this.stats.corrections.totalTokens += usage.totalTokens;
        this.stats.callCount.corrections++;
        this.updateTotal();
    }

    // Registra uso de tokens para insights
    recordInsight(usage: TokenUsage) {
        this.stats.insights.promptTokens += usage.promptTokens;
        this.stats.insights.completionTokens += usage.completionTokens;
        this.stats.insights.totalTokens += usage.totalTokens;
        this.stats.callCount.insights++;
        this.updateTotal();
    }

    // Registra uso de tokens para anamnese
    recordAnamnesis(usage: TokenUsage) {
        this.stats.anamnesis.promptTokens += usage.promptTokens;
        this.stats.anamnesis.completionTokens += usage.completionTokens;
        this.stats.anamnesis.totalTokens += usage.totalTokens;
        this.stats.callCount.anamnesis++;
        this.updateTotal();
    }

    private updateTotal() {
        this.stats.total.promptTokens = 
            this.stats.corrections.promptTokens + 
            this.stats.insights.promptTokens + 
            this.stats.anamnesis.promptTokens;
        
        this.stats.total.completionTokens = 
            this.stats.corrections.completionTokens + 
            this.stats.insights.completionTokens + 
            this.stats.anamnesis.completionTokens;
        
        this.stats.total.totalTokens = 
            this.stats.total.promptTokens + 
            this.stats.total.completionTokens;
    }

    // Retorna estatísticas atuais
    getStats(): TokenStats {
        return { ...this.stats };
    }

    // Reseta estatísticas
    reset() {
        this.stats = {
            corrections: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            insights: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            anamnesis: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            total: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            callCount: {
                corrections: 0,
                insights: 0,
                anamnesis: 0,
            }
        };
    }
}

export const tokenTracker = new TokenTrackerService();

