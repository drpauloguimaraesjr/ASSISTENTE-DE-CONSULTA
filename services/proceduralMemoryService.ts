/**
 * Procedural Memory Service
 * Inspired by Agent-S's procedural memory system
 * Learns from successful interactions and improves over time
 */

export interface ProceduralStep {
    action: string;
    context: string;
    result: 'success' | 'failure' | 'partial';
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface ProceduralPattern {
    id: string;
    sequence: ProceduralStep[];
    successRate: number;
    frequency: number;
    lastUsed: Date;
    tags: string[];
}

class ProceduralMemoryService {
    private patterns: ProceduralPattern[] = [];
    private currentSequence: ProceduralStep[] = [];
    private readonly MAX_PATTERNS = 50;
    private readonly MIN_SUCCESS_RATE = 0.7;

    /**
     * Start tracking a new interaction sequence
     */
    startSequence() {
        this.currentSequence = [];
    }

    /**
     * Record a step in the current sequence
     */
    recordStep(
        action: string,
        context: string,
        result: 'success' | 'failure' | 'partial',
        metadata?: Record<string, any>
    ) {
        const step: ProceduralStep = {
            action,
            context,
            result,
            timestamp: new Date(),
            metadata,
        };
        this.currentSequence.push(step);
    }

    /**
     * Complete current sequence and learn from it
     */
    completeSequence(overallSuccess: boolean) {
        if (this.currentSequence.length === 0) return;

        // Only store successful patterns or patterns with high success rate
        const successCount = this.currentSequence.filter(s => s.result === 'success').length;
        const successRate = successCount / this.currentSequence.length;

        if (overallSuccess || successRate >= this.MIN_SUCCESS_RATE) {
            // Extract tags from context
            const tags = this.extractTags(this.currentSequence);

            // Check if similar pattern exists
            const similarPattern = this.findSimilarPattern(this.currentSequence);
            
            if (similarPattern) {
                // Update existing pattern
                similarPattern.frequency++;
                similarPattern.successRate = 
                    (similarPattern.successRate * similarPattern.frequency + (overallSuccess ? 1 : 0)) 
                    / (similarPattern.frequency + 1);
                similarPattern.lastUsed = new Date();
                
                // Update sequence if this one is better
                if (overallSuccess && similarPattern.successRate < successRate) {
                    similarPattern.sequence = [...this.currentSequence];
                }
            } else {
                // Create new pattern
                const pattern: ProceduralPattern = {
                    id: Date.now().toString(),
                    sequence: [...this.currentSequence],
                    successRate: overallSuccess ? 1.0 : successRate,
                    frequency: 1,
                    lastUsed: new Date(),
                    tags,
                };
                this.patterns.push(pattern);
            }

            // Limit patterns
            if (this.patterns.length > this.MAX_PATTERNS) {
                this.patterns = this.patterns
                    .sort((a, b) => {
                        // Sort by success rate * frequency
                        const scoreA = a.successRate * a.frequency;
                        const scoreB = b.successRate * b.frequency;
                        return scoreB - scoreA;
                    })
                    .slice(0, this.MAX_PATTERNS);
            }
        }

        this.currentSequence = [];
    }

    /**
     * Extract tags from sequence context
     */
    private extractTags(sequence: ProceduralStep[]): string[] {
        const tags: Set<string> = new Set();
        const medicalKeywords = [
            'anamnese', 'sintoma', 'diagnóstico', 'medicamento', 'exame',
            'dor', 'febre', 'tosse', 'pressão', 'glicose'
        ];

        for (const step of sequence) {
            const contextLower = step.context.toLowerCase();
            for (const keyword of medicalKeywords) {
                if (contextLower.includes(keyword)) {
                    tags.add(keyword);
                }
            }
        }

        return Array.from(tags);
    }

    /**
     * Find similar pattern to current sequence
     */
    private findSimilarPattern(sequence: ProceduralStep[]): ProceduralPattern | null {
        if (sequence.length === 0) return null;

        let bestMatch: ProceduralPattern | null = null;
        let bestSimilarity = 0.5; // Minimum similarity threshold

        for (const pattern of this.patterns) {
            const similarity = this.calculateSimilarity(sequence, pattern.sequence);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = pattern;
            }
        }

        return bestMatch;
    }

    /**
     * Calculate similarity between two sequences
     */
    private calculateSimilarity(seq1: ProceduralStep[], seq2: ProceduralStep[]): number {
        if (seq1.length === 0 || seq2.length === 0) return 0;

        // Compare actions
        const actions1 = seq1.map(s => s.action.toLowerCase());
        const actions2 = seq2.map(s => s.action.toLowerCase());

        // Simple similarity: percentage of matching actions
        let matches = 0;
        const minLength = Math.min(actions1.length, actions2.length);
        for (let i = 0; i < minLength; i++) {
            if (actions1[i] === actions2[i]) {
                matches++;
            }
        }

        return matches / Math.max(actions1.length, actions2.length);
    }

    /**
     * Get procedural guidance for current context
     */
    getGuidance(context: string): string | null {
        const relevantPatterns = this.patterns
            .filter(p => {
                // Check if pattern tags match context
                const contextLower = context.toLowerCase();
                return p.tags.some(tag => contextLower.includes(tag));
            })
            .sort((a, b) => {
                // Sort by success rate and recency
                const recencyA = Date.now() - a.lastUsed.getTime();
                const recencyB = Date.now() - b.lastUsed.getTime();
                const recencyScoreA = 1 / (1 + recencyA / (1000 * 60 * 60 * 24)); // Days
                const recencyScoreB = 1 / (1 + recencyB / (1000 * 60 * 60 * 24));
                
                const scoreA = a.successRate * a.frequency * recencyScoreA;
                const scoreB = b.successRate * b.frequency * recencyScoreB;
                return scoreB - scoreA;
            })
            .slice(0, 1); // Get best pattern

        if (relevantPatterns.length === 0) return null;

        const pattern = relevantPatterns[0];
        
        // Generate guidance from successful steps
        const successfulSteps = pattern.sequence.filter(s => s.result === 'success');
        if (successfulSteps.length === 0) return null;

        return `**Padrão de Sucesso Identificado:**\n` +
               `Baseado em interações anteriores similares (taxa de sucesso: ${(pattern.successRate * 100).toFixed(0)}%), ` +
               `considere focar nas seguintes áreas: ${successfulSteps.map(s => s.action).join(', ')}.`;
    }

    /**
     * Save patterns to localStorage
     */
    savePatterns() {
        try {
            const serialized = JSON.stringify(
                this.patterns.map(p => ({
                    ...p,
                    sequence: p.sequence.map(s => ({
                        ...s,
                        timestamp: s.timestamp.toISOString(),
                    })),
                    lastUsed: p.lastUsed.toISOString(),
                }))
            );
            localStorage.setItem('proceduralMemory', serialized);
        } catch (error) {
            console.error('Failed to save procedural memory:', error);
        }
    }

    /**
     * Load patterns from localStorage
     */
    loadPatterns() {
        try {
            const stored = localStorage.getItem('proceduralMemory');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.patterns = parsed.map((p: any) => ({
                    ...p,
                    sequence: p.sequence.map((s: any) => ({
                        ...s,
                        timestamp: new Date(s.timestamp),
                    })),
                    lastUsed: new Date(p.lastUsed),
                }));
            }
        } catch (error) {
            console.error('Failed to load procedural memory:', error);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalPatterns: this.patterns.length,
            averageSuccessRate: this.patterns.length > 0
                ? this.patterns.reduce((sum, p) => sum + p.successRate, 0) / this.patterns.length
                : 0,
            totalSequences: this.patterns.reduce((sum, p) => sum + p.frequency, 0),
        };
    }
}

export const proceduralMemoryService = new ProceduralMemoryService();


