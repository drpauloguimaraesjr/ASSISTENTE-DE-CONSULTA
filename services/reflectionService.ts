/**
 * Reflection Service
 * Inspired by Agent-S's reflection system
 * Reviews and improves AI-generated content before presenting to user
 */

export interface ReflectionResult {
    improvedContent: string;
    improvements: string[];
    confidence: number;
}

export interface ReflectionContext {
    originalContent: string;
    transcript: string;
    previousContent?: string;
    type: 'insight' | 'anamnesis';
}

class ReflectionService {
    private readonly MIN_CONFIDENCE_THRESHOLD = 0.7;
    private readonly MAX_IMPROVEMENT_ITERATIONS = 2;

    /**
     * Reflect on and improve generated content
     */
    async reflect(
        content: string,
        context: ReflectionContext
    ): Promise<ReflectionResult> {
        // Basic validation first
        const validation = this.validateContent(content, context);
        if (!validation.isValid) {
            return {
                improvedContent: content,
                improvements: [`Validação: ${validation.reason}`],
                confidence: 0.5,
            };
        }

        let improvedContent = content;
        const improvements: string[] = [];
        let confidence = this.calculateInitialConfidence(content, context);

        // Apply improvements iteratively
        for (let i = 0; i < this.MAX_IMPROVEMENT_ITERATIONS; i++) {
            const analysis = this.analyzeContent(improvedContent, context);
            
            if (analysis.needsImprovement) {
                const improved = this.applyImprovements(improvedContent, analysis, context);
                if (improved !== improvedContent) {
                    improvements.push(...analysis.suggestions);
                    improvedContent = improved;
                    confidence = Math.min(confidence + 0.1, 1.0); // Increase confidence with improvements
                } else {
                    break; // No more improvements possible
                }
            } else {
                break; // Content is good enough
            }
        }

        return {
            improvedContent,
            improvements,
            confidence,
        };
    }

    /**
     * Validate content quality
     */
    private validateContent(
        content: string,
        context: ReflectionContext
    ): { isValid: boolean; reason?: string } {
        if (!content || content.trim().length === 0) {
            return { isValid: false, reason: 'Conteúdo vazio' };
        }

        if (context.type === 'anamnesis') {
            // Check if anamnesis has minimum structure
            const requiredSections = ['[NOME DO PACIENTE]', '[QUEIXA PRINCIPAL]'];
            const hasRequiredSections = requiredSections.some(section => 
                content.includes(section)
            );
            
            if (!hasRequiredSections) {
                return { isValid: false, reason: 'Estrutura de anamnese incompleta' };
            }
        }

        // Check for obvious errors
        if (content.length < 10) {
            return { isValid: false, reason: 'Conteúdo muito curto' };
        }

        return { isValid: true };
    }

    /**
     * Calculate initial confidence score
     */
    private calculateInitialConfidence(
        content: string,
        context: ReflectionContext
    ): number {
        let confidence = 0.5; // Base confidence

        // Length-based confidence
        if (content.length > 100) confidence += 0.1;
        if (content.length > 500) confidence += 0.1;

        // Structure-based confidence
        if (context.type === 'anamnesis') {
            const sections = content.match(/\[[^\]]+\]/g);
            if (sections && sections.length > 5) {
                confidence += 0.2;
            }
        }

        // Context relevance
        if (context.transcript) {
            const transcriptLower = context.transcript.toLowerCase();
            const contentLower = content.toLowerCase();
            
            // Check for overlap
            const transcriptWords = new Set(transcriptLower.split(/\s+/));
            const contentWords = contentLower.split(/\s+/);
            const overlap = contentWords.filter(w => transcriptWords.has(w)).length;
            const relevance = overlap / Math.max(contentWords.length, 1);
            
            confidence += Math.min(relevance * 0.2, 0.2);
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Analyze content for improvements
     */
    private analyzeContent(
        content: string,
        context: ReflectionContext
    ): { needsImprovement: boolean; suggestions: string[] } {
        const suggestions: string[] = [];

        // Check for repetition
        const sentences = content.split(/[.!?]\s+/);
        const uniqueSentences = new Set(sentences.map(s => s.toLowerCase().trim()));
        if (uniqueSentences.size < sentences.length * 0.8) {
            suggestions.push('Reduzir repetições de frases');
        }

        // Check for completeness
        if (context.type === 'anamnesis') {
            const sections = content.match(/\[[^\]]+\]/g) || [];
            if (sections.length < 5) {
                suggestions.push('Adicionar mais seções à anamnese');
            }
        }

        // Check for relevance to transcript
        if (context.transcript) {
            const transcriptLower = context.transcript.toLowerCase();
            const contentLower = content.toLowerCase();
            const transcriptKeywords = transcriptLower.split(/\s+/).filter(w => w.length > 4);
            const mentionedKeywords = transcriptKeywords.filter(kw => contentLower.includes(kw)).length;
            
            if (mentionedKeywords / transcriptKeywords.length < 0.3) {
                suggestions.push('Aumentar relevância com base na transcrição');
            }
        }

        // Check for formatting issues
        if (content.includes('  ')) {
            suggestions.push('Corrigir espaçamento duplo');
        }

        return {
            needsImprovement: suggestions.length > 0,
            suggestions,
        };
    }

    /**
     * Apply improvements to content
     */
    private applyImprovements(
        content: string,
        analysis: { needsImprovement: boolean; suggestions: string[] },
        context: ReflectionContext
    ): string {
        let improved = content;

        // Apply basic formatting fixes
        improved = improved.replace(/\s{2,}/g, ' '); // Remove multiple spaces
        improved = improved.replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

        // If suggestion is about relevance, try to incorporate transcript keywords
        if (analysis.suggestions.some(s => s.includes('relevância'))) {
            if (context.transcript) {
                const transcriptLower = context.transcript.toLowerCase();
                const contentLower = improved.toLowerCase();
                
                // Find important keywords from transcript that aren't in content
                const transcriptWords = transcriptLower.split(/\s+/).filter(w => 
                    w.length > 4 && !contentLower.includes(w.toLowerCase())
                );
                
                // Simple heuristic: if we find important medical terms, note them
                const medicalTerms = transcriptWords.filter(w => 
                    /^(dor|febre|tosse|pressão|medicamento|alergia|cirurgia)/i.test(w)
                );
                
                // Don't modify content directly, but flag for improvement
                // The actual improvement would need LLM call
            }
        }

        return improved.trim();
    }

    /**
     * Compare with previous content to detect changes
     */
    compareWithPrevious(
        current: string,
        previous?: string
    ): { hasChanged: boolean; changes: string[] } {
        if (!previous) {
            return { hasChanged: true, changes: ['Nova geração de conteúdo'] };
        }

        const changes: string[] = [];
        
        // Simple comparison
        if (current.length !== previous.length) {
            changes.push(`Tamanho: ${previous.length} → ${current.length} caracteres`);
        }

        // Check for new sections in anamnesis
        const currentSections = new Set(current.match(/\[[^\]]+\]/g) || []);
        const previousSections = new Set(previous.match(/\[[^\]]+\]/g) || []);
        
        const newSections = Array.from(currentSections).filter(s => !previousSections.has(s));
        const removedSections = Array.from(previousSections).filter(s => !currentSections.has(s));

        if (newSections.length > 0) {
            changes.push(`Novas seções: ${newSections.join(', ')}`);
        }
        if (removedSections.length > 0) {
            changes.push(`Seções removidas: ${removedSections.join(', ')}`);
        }

        return {
            hasChanged: changes.length > 0 || current !== previous,
            changes,
        };
    }

    /**
     * Generate reflection prompt for LLM-based improvement
     */
    generateReflectionPrompt(content: string, context: ReflectionContext): string {
        const basePrompt = context.type === 'anamnesis'
            ? this.generateAnamnesisReflectionPrompt(content, context)
            : this.generateInsightReflectionPrompt(content, context);

        return basePrompt;
    }

    private generateAnamnesisReflectionPrompt(
        content: string,
        context: ReflectionContext
    ): string {
        return `Você é um assistente especializado em revisar anamneses médicas. Revise a anamnese abaixo e melhore-a com base na transcrição fornecida.

**Anamnese Atual:**
${content}

**Transcrição da Consulta:**
${context.transcript}

**Instruções:**
1. Verifique se todas as informações da transcrição foram capturadas
2. Corrija erros ou inconsistências
3. Melhore a estrutura e organização
4. Complete seções que estão vazias ou incompletas
5. Mantenha o formato original da estrutura

**Anamnese Melhorada:**`;
    }

    private generateInsightReflectionPrompt(
        content: string,
        context: ReflectionContext
    ): string {
        return `Você é um assistente que revisa insights médicos. Revise o insight abaixo e melhore-o.

**Insight Atual:**
${content}

**Contexto da Transcrição:**
${context.transcript.substring(Math.max(0, context.transcript.length - 500))}

**Instruções:**
1. Torne o insight mais preciso e relevante
2. Elimine repetições
3. Foque nos aspectos mais importantes da conversa recente
4. Seja conciso mas informativo

**Insight Melhorado:**`;
    }
}

export const reflectionService = new ReflectionService();


