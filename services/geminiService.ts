import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InsightProvider } from "../components/SettingsPanel";
import { medicalKnowledgeService } from "./medicalKnowledgeService";
import { proceduralMemoryService } from "./proceduralMemoryService";
import { reflectionService } from "./reflectionService";
import { tokenTracker } from "./tokenTracker";

const getGeminiAI = (apiKey?: string) => {
    const finalApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!finalApiKey) {
        throw new Error("API Key for Gemini not found.");
    }
    return new GoogleGenAI({ apiKey: finalApiKey });
}

// Correção/refinamento de transcrição usando Gemini 2.5 Flash REST
export const correctTranscription = async (
    rawTranscript: string,
    apiKey?: string
): Promise<string> => {
    if (!rawTranscript.trim()) return rawTranscript;
    
    const ai = getGeminiAI(apiKey);
    
    const prompt = `Você é um assistente de transcrição médica. Corrija e melhore a transcrição abaixo, mantendo o sentido original mas corrigindo:
- Erros de ortografia e gramática
- Termos médicos mal escritos
- Pontuação adequada
- Formatação clara

Mantenha o conteúdo exatamente como foi falado, apenas corrigindo erros. Retorne APENAS a transcrição corrigida, sem comentários.

Transcrição original:
---
${rawTranscript}
---

Transcrição corrigida:`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        // Rastreia tokens
        const usage = tokenTracker.extractTokensFromResponse(response);
        tokenTracker.recordCorrection(usage);
        
        return response.text.trim();
    } catch (error: any) {
        console.error('Erro ao corrigir transcrição:', error);
        // Retorna original se falhar
        return rawTranscript;
    }
}

const generateGeminiInsight = async (transcript: string, apiKey: string) => {
    const ai = getGeminiAI(apiKey);
    
    // Enhance with medical knowledge
    const medicalContext = medicalKnowledgeService.getRelevantContext(transcript);
    const proceduralGuidance = proceduralMemoryService.getGuidance(transcript);
    
    let prompt = `Você é um assistente de IA em uma consulta médica em tempo real. Com base na transcrição a seguir, gere um pensamento breve e perspicaz, uma conexão potencial ou os próximos passos, como se fosse o monólogo interior ou 'fluxo de consciência' do médico. Não repita a transcrição. Concentre-se na interpretação e síntese. Mantenha cada pensamento em um único ponto curto. A parte mais recente da conversa é a mais importante.`;

    if (medicalContext) {
        prompt += `\n\n**Contexto Médico Relevante:**\n${medicalContext}`;
    }

    if (proceduralGuidance) {
        prompt += `\n\n${proceduralGuidance}`;
    }

    prompt += `\n\nTranscrição:
---
${transcript}
---

Insight Curto:`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    // Rastreia tokens
    const usage = tokenTracker.extractTokensFromResponse(response);
    tokenTracker.recordInsight(usage);
    
    let insight = response.text.trim();
    
    // Apply reflection to improve insight
    const reflection = await reflectionService.reflect(insight, {
        originalContent: insight,
        transcript,
        type: 'insight',
    });
    
    // Record procedural step
    proceduralMemoryService.recordStep(
        'generate_insight',
        transcript.substring(Math.max(0, transcript.length - 200)),
        reflection.confidence > 0.7 ? 'success' : 'partial',
        { confidence: reflection.confidence }
    );
    
    // Store in knowledge if high confidence
    if (reflection.confidence > 0.7) {
        medicalKnowledgeService.addContext(insight);
    }
    
    return reflection.improvedContent;
};

const generateOpenAIInsight = async (transcript: string, apiKey: string) => {
    const prompt = `You are an AI assistant in a real-time medical consultation. Based on the following transcript, generate a brief, insightful thought, a potential connection, or next steps, as if it were the doctor's inner monologue or 'stream of consciousness'. Do not repeat the transcript. Focus on interpretation and synthesis. Keep each thought to a single short point. The most recent part of the conversation is the most important.

Transcript:
---
${transcript}
---

Brief Insight:`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 60,
            temperature: 0.7,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};

const generateGrokInsight = async (transcript: string, apiKey: string) => {
    const prompt = `You are an AI assistant with a sharp, insightful, and slightly unconventional perspective, observing a medical consultation. Based on the following transcript, provide a concise, non-obvious connection or a forward-thinking next step. Emulate a "stream of consciousness" from a brilliant, slightly maverick doctor. Be brief.

Transcript:
---
${transcript}
---

Insight:`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", { // Placeholder URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "grok-1", // Placeholder model
            messages: [{ role: "user", content: prompt }],
            max_tokens: 60,
            temperature: 0.6,
        })
    });
     if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Grok API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};

const insightProviderFunctions: Record<InsightProvider, (transcript: string, apiKey: string) => Promise<string>> = {
    gemini: generateGeminiInsight,
    openai: generateOpenAIInsight,
    grok: generateGrokInsight,
};

const providerPriority: InsightProvider[] = ['gemini', 'openai', 'grok'];

export const generateInsightsWithFailover = async (
    transcript: string,
    preferredProvider: InsightProvider,
    apiKeys: { openai: string; grok: string }
): Promise<{ insight: string; provider: InsightProvider | null }> => {
    
    // Reorder priority list to try preferred provider first, without duplicates
    const orderedProviders = [
        preferredProvider,
        ...providerPriority.filter(p => p !== preferredProvider)
    ];

    for (const provider of orderedProviders) {
        const apiKey = provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY as string | undefined : apiKeys[provider as keyof typeof apiKeys];

        if (!apiKey) {
            console.warn(`API key for ${provider} is missing. Skipping.`);
            continue; // Skip if no key
        }

        try {
            const insight = await insightProviderFunctions[provider](transcript, apiKey);
            console.log(`Successfully generated insight with ${provider}`);
            return { insight, provider };
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            console.error(`Failed to generate insight with ${provider}:`, errorMsg);
            // Log the full error for debugging
            if (provider === 'gemini') {
                console.error('Gemini API error details:', {
                    hasApiKey: !!apiKey,
                    apiKeyPrefix: apiKey?.substring(0, 10),
                    error: errorMsg
                });
            }
            // Continue to the next provider
        }
    }

    // If all providers failed
    return {
        insight: 'Falha ao gerar insight. Verifique suas chaves de API e a conexão.',
        provider: null,
    };
};

// --- Anamnesis Generation with Failover ---

const generateGeminiAnamnesis = async (transcript: string, anamnesisPrompt: string, apiKey: string, previousAnamnesis?: string): Promise<string> => {
    const ai = getGeminiAI(apiKey);
    
    // Enhance with medical knowledge and similar patterns
    const medicalContext = medicalKnowledgeService.getRelevantContext(transcript);
    const similarPatterns = medicalKnowledgeService.findSimilarPatterns(transcript);
    
    let prompt = anamnesisPrompt;
    
    if (medicalContext) {
        prompt += `\n\n**Contexto Médico Relevante:**\n${medicalContext}`;
    }
    
    if (similarPatterns.length > 0) {
        prompt += `\n\n**Consultas Similares Anteriores:**\n`;
        for (const pattern of similarPatterns.slice(0, 2)) {
            prompt += `- Estrutura de anamnese bem-sucedida anteriormente para contexto similar.\n`;
        }
    }
    
    if (previousAnamnesis) {
        prompt += `\n\n**Anamnese Anterior (para referência e atualização):**\n${previousAnamnesis}\n\n**ATUALIZE** a anamnese anterior com as novas informações da transcrição abaixo. Mantenha o que já estava correto e adicione/melhore com base no novo contexto.`;
    }
    
    prompt += `\n\nTranscrição da Consulta para Análise:\n---\n${transcript}\n---\n\nPreencha o prontuário acima com base na transcrição fornecida:`;
    
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    
    // Rastreia tokens
    const usage = tokenTracker.extractTokensFromResponse(response);
    tokenTracker.recordAnamnesis(usage);
    
    let anamnesis = response.text.trim();
    
    // Apply reflection to improve anamnesis
    const reflection = await reflectionService.reflect(anamnesis, {
        originalContent: anamnesis,
        transcript,
        previousContent: previousAnamnesis,
        type: 'anamnesis',
    });
    
    // Record procedural step
    proceduralMemoryService.recordStep(
        'generate_anamnesis',
        transcript.substring(Math.max(0, transcript.length - 500)),
        reflection.confidence > 0.7 ? 'success' : 'partial',
        { 
            confidence: reflection.confidence,
            sectionsCount: (anamnesis.match(/\[[^\]]+\]/g) || []).length 
        }
    );
    
    // Store successful pattern if high quality
    if (reflection.confidence > 0.8 && anamnesis.length > 200) {
        const keywords = medicalKnowledgeService.extractPatterns(transcript).map(p => p.symptom);
        const insights = []; // Can extract from previous insights if available
        medicalKnowledgeService.storeConsultationPattern(
            keywords,
            anamnesis,
            insights
        );
    }
    
    return reflection.improvedContent;
};

const generateOpenAIAnamnesis = async (transcript: string, anamnesisPrompt: string, apiKey: string): Promise<string> => {
    const prompt = `Based on the full consultation transcript below, update and complete the structured anamnesis provided. The anamnesis template is in Portuguese; maintain the structure and language. If information is missing, leave the field blank or write "não informado".

Anamnesis Template & Instructions:
---
${anamnesisPrompt}
---

Full Consultation Transcript:
---
${transcript}
---

Completed Anamnesis (in Portuguese):`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024,
            temperature: 0.2,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};

const generateGrokAnamnesis = async (transcript: string, anamnesisPrompt: string, apiKey: string): Promise<string> => {
    // Grok might be less formal, so we give it a very direct instruction.
    const prompt = `Your task is to fill out a medical anamnesis form. The form template and instructions are in Portuguese. The consultation transcript is also provided. Read the transcript and fill out the form accurately. Maintain the original Portuguese language and structure.

Anamnesis Template & Instructions:
---
${anamnesisPrompt}
---

Full Consultation Transcript:
---
${transcript}
---

Filled Anamnesis (in Portuguese):`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "grok-1",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024,
            temperature: 0.2,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Grok API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};


// Update function signatures to support previous anamnesis
const generateOpenAIAnamnesisEnhanced = async (transcript: string, anamnesisPrompt: string, apiKey: string, previousAnamnesis?: string): Promise<string> => {
    let prompt = `Based on the full consultation transcript below, update and complete the structured anamnesis provided. The anamnesis template is in Portuguese; maintain the structure and language. If information is missing, leave the field blank or write "não informado".`;

    if (previousAnamnesis) {
        prompt += `\n\n**Previous Anamnesis (for reference and update):**\n${previousAnamnesis}\n\n**UPDATE** the previous anamnesis with new information from the transcript below. Keep what was already correct and add/improve based on the new context.`;
    }

    prompt += `\n\nAnamnesis Template & Instructions:
---
${anamnesisPrompt}
---

Full Consultation Transcript:
---
${transcript}
---

Completed Anamnesis (in Portuguese):`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024,
            temperature: 0.2,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};

const generateGrokAnamnesisEnhanced = async (transcript: string, anamnesisPrompt: string, apiKey: string, previousAnamnesis?: string): Promise<string> => {
    let prompt = `Your task is to fill out a medical anamnesis form. The form template and instructions are in Portuguese. The consultation transcript is also provided. Read the transcript and fill out the form accurately. Maintain the original Portuguese language and structure.`;

    if (previousAnamnesis) {
        prompt += `\n\n**Previous Anamnesis (for reference and update):**\n${previousAnamnesis}\n\n**UPDATE** the previous anamnesis with new information from the transcript below.`;
    }

    prompt += `\n\nAnamnesis Template & Instructions:
---
${anamnesisPrompt}
---

Full Consultation Transcript:
---
${transcript}
---

Filled Anamnesis (in Portuguese):`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "grok-1",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024,
            temperature: 0.2,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Grok API error: ${errorData.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
};

const anamnesisProviderFunctions: Record<InsightProvider, (transcript: string, anamnesisPrompt: string, apiKey: string, previousAnamnesis?: string) => Promise<string>> = {
    gemini: generateGeminiAnamnesis,
    openai: generateOpenAIAnamnesisEnhanced,
    grok: generateGrokAnamnesisEnhanced,
};

export const generateAnamnesisWithFailover = async (
    transcript: string,
    anamnesisPrompt: string,
    preferredProvider: InsightProvider,
    apiKeys: { openai: string; grok: string },
    previousAnamnesis?: string
): Promise<{ anamnesis: string; provider: InsightProvider | null }> => {
    
    const orderedProviders = [
        preferredProvider,
        ...providerPriority.filter(p => p !== preferredProvider)
    ];

    for (const provider of orderedProviders) {
        const apiKey = provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY as string | undefined : apiKeys[provider as keyof typeof apiKeys];

        if (!apiKey) {
            console.warn(`API key for ${provider} is missing. Skipping for anamnesis.`);
            continue;
        }

        try {
            // Use enhanced function with previous anamnesis support
            const generateFunc = provider === 'gemini' 
                ? generateGeminiAnamnesis 
                : anamnesisProviderFunctions[provider];
            
            const anamnesis = await generateFunc(transcript, anamnesisPrompt, apiKey, previousAnamnesis);
            console.log(`Successfully generated anamnesis with ${provider}`);
            
            // Complete procedural sequence on success
            proceduralMemoryService.completeSequence(true);
            
            return { anamnesis, provider };
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            console.error(`Failed to generate anamnesis with ${provider}:`, errorMsg);
            // Log the full error for debugging
            if (provider === 'gemini') {
                console.error('Gemini API error details (anamnesis):', {
                    hasApiKey: !!apiKey,
                    apiKeyPrefix: apiKey?.substring(0, 10),
                    error: errorMsg
                });
            }
            // Record failure
            proceduralMemoryService.recordStep(
                'generate_anamnesis',
                transcript.substring(Math.max(0, transcript.length - 200)),
                'failure',
                { error: errorMsg }
            );
        }
    }

    // Complete sequence as partial failure
    proceduralMemoryService.completeSequence(false);

    return {
        anamnesis: 'Falha ao atualizar a anamnese. Verifique suas chaves de API e a conexão.',
        provider: null,
    };
};


export const generateDailySummary = async (dailyTranscripts: string[]): Promise<string> => {
    if (dailyTranscripts.length === 0) {
        return "Nenhuma consulta hoje para analisar.";
    }

    const ai = getGeminiAI(); // Daily summary continues to use Gemini
    const fullDayTranscript = dailyTranscripts.join('\n\n---\n\n');

    const prompt = `
Você é um consultor de marketing de conteúdo para um profissional de saúde. Analise o conjunto de transcrições de consultas de hoje, que foram anonimizadas. Seu objetivo é identificar os temas e preocupações mais recorrentes entre os pacientes e, com base neles, sugerir 3 ideias de posts para redes sociais.

Para cada ideia, forneça:
1.  **Tema Principal:** Um título curto e direto.
2.  **Público-Alvo:** Para quem este post é mais relevante? (ex: pacientes com diabetes, pessoas buscando melhorar o sono, etc.)
3.  **Formato Sugerido:** (ex: Carrossel no Instagram, Vídeo curto/Reel, Post de blog, etc.)
4.  **Esboço do Conteúdo:** Uma breve descrição do que abordar no post.

**Exemplo de Saída:**
**Ideia 1:**
*   **Tema Principal:** Mitos e Verdades sobre o Jejum Intermitente
*   **Público-Alvo:** Pessoas interessadas em perda de peso e bem-estar.
*   **Formato Sugerido:** Carrossel no Instagram (5 slides).
*   **Esboço do Conteúdo:** Slide 1: Título chamativo. Slide 2: O que é Jejum Intermitente? Slide 3: Mito comum (ex: "Jejum deixa o metabolismo lento"). Slide 4: A verdade científica. Slide 5: CTA (ex: "Consulte um profissional antes de começar").

---
**Transcrições do Dia:**
${fullDayTranscript}
---

**Análise e Sugestões de Posts:**
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for better analysis
            contents: prompt,
        });

        // Fix: Correctly access the generated text from the response object.
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for daily summary:", error);
        return "Ocorreu um erro ao tentar gerar as ideias para posts.";
    }
};