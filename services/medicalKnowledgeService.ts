/**
 * Medical Knowledge Service
 * Inspired by Agent-S's knowledge management system
 * Maintains structured medical knowledge and patterns
 */

export interface MedicalPattern {
    symptom: string;
    associatedConditions: string[];
    commonQuestions: string[];
    relevanceScore: number;
}

export interface ConsultationPattern {
    id: string;
    keywords: string[];
    anamnesisStructure: string;
    insights: string[];
    successRate: number;
    lastUsed: Date;
}

export interface MedicalKnowledge {
    patterns: MedicalPattern[];
    consultationPatterns: ConsultationPattern[];
    contextHistory: string[];
}

class MedicalKnowledgeService {
    private knowledge: MedicalKnowledge = {
        patterns: [],
        consultationPatterns: [],
        contextHistory: [],
    };

    private readonly MAX_CONTEXT_HISTORY = 50;
    private readonly MAX_PATTERNS = 100;

    /**
     * Initialize with common medical patterns
     */
    constructor() {
        this.initializeCommonPatterns();
    }

    private initializeCommonPatterns() {
        this.knowledge.patterns = [
            {
                symptom: 'dor de cabeça',
                associatedConditions: ['enxaqueca', 'tensão', 'sinusite', 'hipertensão'],
                commonQuestions: ['Localização da dor?', 'Intensidade?', 'Frequência?', 'Desencadeantes?'],
                relevanceScore: 0.9,
            },
            {
                symptom: 'febre',
                associatedConditions: ['infecção', 'gripe', 'virose', 'inflamação'],
                commonQuestions: ['Temperatura?', 'Duração?', 'Sintomas associados?', 'Medicamentos em uso?'],
                relevanceScore: 0.9,
            },
            {
                symptom: 'tosse',
                associatedConditions: ['resfriado', 'alergia', 'asma', 'bronquite', 'pneumonia'],
                commonQuestions: ['Tipo de tosse?', 'Duração?', 'Produtiva?', 'Sintomas respiratórios?'],
                relevanceScore: 0.85,
            },
            {
                symptom: 'dor abdominal',
                associatedConditions: ['gastrite', 'úlcera', 'apendicite', 'cólica', 'síndrome do intestino irritável'],
                commonQuestions: ['Localização?', 'Tipo de dor?', 'Relacionada à alimentação?', 'Outros sintomas?'],
                relevanceScore: 0.85,
            },
        ];
    }

    /**
     * Extract relevant patterns from transcript
     */
    extractPatterns(transcript: string): MedicalPattern[] {
        const lowerTranscript = transcript.toLowerCase();
        const relevantPatterns: MedicalPattern[] = [];

        for (const pattern of this.knowledge.patterns) {
            const matches = pattern.associatedConditions.filter(condition =>
                lowerTranscript.includes(condition.toLowerCase())
            );

            if (matches.length > 0 || lowerTranscript.includes(pattern.symptom)) {
                relevantPatterns.push({
                    ...pattern,
                    relevanceScore: matches.length > 0 ? 1.0 : pattern.relevanceScore,
                });
            }
        }

        // Sort by relevance
        return relevantPatterns
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5); // Return top 5 most relevant
    }

    /**
     * Generate contextual questions based on extracted patterns
     */
    generateContextualQuestions(transcript: string): string[] {
        const patterns = this.extractPatterns(transcript);
        const questions: Set<string> = new Set();

        for (const pattern of patterns) {
            for (const question of pattern.commonQuestions) {
                // Check if question hasn't been answered in transcript
                if (!this.isQuestionAnswered(question, transcript)) {
                    questions.add(question);
                }
            }
        }

        return Array.from(questions).slice(0, 3); // Return top 3 most relevant questions
    }

    private isQuestionAnswered(question: string, transcript: string): boolean {
        const questionKeywords = question.toLowerCase().match(/\w+/g) || [];
        const transcriptLower = transcript.toLowerCase();

        // Simple heuristic: if transcript contains keywords from question, consider answered
        return questionKeywords.every(keyword => 
            transcriptLower.includes(keyword) || keyword.length < 3
        );
    }

    /**
     * Store successful consultation pattern
     */
    storeConsultationPattern(
        keywords: string[],
        anamnesisStructure: string,
        insights: string[]
    ): string {
        const id = Date.now().toString();
        const pattern: ConsultationPattern = {
            id,
            keywords,
            anamnesisStructure,
            insights,
            successRate: 1.0,
            lastUsed: new Date(),
        };

        this.knowledge.consultationPatterns.push(pattern);

        // Limit patterns
        if (this.knowledge.consultationPatterns.length > this.MAX_PATTERNS) {
            this.knowledge.consultationPatterns = this.knowledge.consultationPatterns
                .sort((a, b) => b.successRate - a.successRate)
                .slice(0, this.MAX_PATTERNS);
        }

        return id;
    }

    /**
     * Find similar consultation patterns
     */
    findSimilarPatterns(transcript: string): ConsultationPattern[] {
        const transcriptLower = transcript.toLowerCase();
        const similarPatterns: Array<{ pattern: ConsultationPattern; similarity: number }> = [];

        for (const pattern of this.knowledge.consultationPatterns) {
            let matches = 0;
            const patternText = pattern.keywords.join(' ').toLowerCase();

            for (const keyword of pattern.keywords) {
                if (transcriptLower.includes(keyword.toLowerCase())) {
                    matches++;
                }
            }

            if (matches > 0) {
                const similarity = matches / Math.max(pattern.keywords.length, 1);
                similarPatterns.push({ pattern, similarity });
            }
        }

        return similarPatterns
            .sort((a, b) => {
                // Sort by similarity first, then by success rate
                if (Math.abs(a.similarity - b.similarity) < 0.1) {
                    return b.pattern.successRate - a.pattern.successRate;
                }
                return b.similarity - a.similarity;
            })
            .slice(0, 3)
            .map(item => item.pattern);
    }

    /**
     * Update pattern success rate
     */
    updatePatternSuccess(patternId: string, success: boolean) {
        const pattern = this.knowledge.consultationPatterns.find(p => p.id === patternId);
        if (pattern) {
            // Exponential moving average
            const alpha = 0.1;
            pattern.successRate = alpha * (success ? 1.0 : 0.0) + (1 - alpha) * pattern.successRate;
            pattern.lastUsed = new Date();
        }
    }

    /**
     * Add context to history
     */
    addContext(context: string) {
        this.knowledge.contextHistory.push(context);
        if (this.knowledge.contextHistory.length > this.MAX_CONTEXT_HISTORY) {
            this.knowledge.contextHistory.shift();
        }
    }

    /**
     * Get relevant context for prompt enhancement
     */
    getRelevantContext(transcript: string): string {
        const patterns = this.extractPatterns(transcript);
        const similarPatterns = this.findSimilarPatterns(transcript);
        
        let context = '';

        if (patterns.length > 0) {
            context += '**Padrões Médicos Identificados:**\n';
            for (const pattern of patterns) {
                context += `- ${pattern.symptom}: Possíveis condições associadas: ${pattern.associatedConditions.join(', ')}\n`;
            }
            context += '\n';
        }

        if (similarPatterns.length > 0) {
            context += '**Consultas Similares Anteriores:**\n';
            for (const pattern of similarPatterns.slice(0, 2)) {
                context += `- Insights anteriores que podem ser relevantes: ${pattern.insights.slice(0, 2).join(', ')}\n`;
            }
            context += '\n';
        }

        return context;
    }

    /**
     * Save knowledge to localStorage (for persistence)
     */
    saveKnowledge() {
        try {
            const serialized = JSON.stringify({
                ...this.knowledge,
                consultationPatterns: this.knowledge.consultationPatterns.map(p => ({
                    ...p,
                    lastUsed: p.lastUsed.toISOString(),
                })),
            });
            localStorage.setItem('medicalKnowledge', serialized);
        } catch (error) {
            console.error('Failed to save medical knowledge:', error);
        }
    }

    /**
     * Load knowledge from localStorage
     */
    loadKnowledge() {
        try {
            const stored = localStorage.getItem('medicalKnowledge');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.knowledge = {
                    ...parsed,
                    consultationPatterns: parsed.consultationPatterns.map((p: any) => ({
                        ...p,
                        lastUsed: new Date(p.lastUsed),
                    })),
                };
            }
        } catch (error) {
            console.error('Failed to load medical knowledge:', error);
        }
    }
    /**
     * Get all medical patterns
     */
    getPatterns(): MedicalPattern[] {
        return [...this.knowledge.patterns];
    }

    /**
     * Add a new medical pattern
     */
    addPattern(pattern: MedicalPattern) {
        this.knowledge.patterns.push(pattern);
        this.saveKnowledge();
    }

    /**
     * Update an existing medical pattern
     */
    updatePattern(index: number, pattern: MedicalPattern) {
        if (index >= 0 && index < this.knowledge.patterns.length) {
            this.knowledge.patterns[index] = pattern;
            this.saveKnowledge();
        }
    }

    /**
     * Delete a medical pattern
     */
    deletePattern(index: number) {
        if (index >= 0 && index < this.knowledge.patterns.length) {
            this.knowledge.patterns.splice(index, 1);
            this.saveKnowledge();
        }
    }
}

export const medicalKnowledgeService = new MedicalKnowledgeService();


