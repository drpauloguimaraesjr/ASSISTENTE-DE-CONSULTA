import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InsightProvider } from "../components/SettingsPanel";

const getGeminiAI = (apiKey?: string) => {
    const finalApiKey = apiKey || process.env.API_KEY;
    if (!finalApiKey) {
        throw new Error("API Key for Gemini not found.");
    }
    return new GoogleGenAI({ apiKey: finalApiKey });
}

const generateGeminiInsight = async (transcript: string, apiKey: string) => {
    const ai = getGeminiAI(apiKey);
    const prompt = `Você é um assistente de IA em uma consulta médica em tempo real. Com base na transcrição a seguir, gere um pensamento breve e perspicaz, uma conexão potencial ou os próximos passos, como se fosse o monólogo interior ou 'fluxo de consciência' do médico. Não repita a transcrição. Concentre-se na interpretação e síntese. Mantenha cada pensamento em um único ponto curto. A parte mais recente da conversa é a mais importante.

Transcrição:
---
${transcript}
---

Insight Curto:`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    // Fix: Correctly access the generated text from the response object.
    return response.text.trim();
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
        const apiKey = provider === 'gemini' ? process.env.API_KEY : apiKeys[provider as keyof typeof apiKeys];

        if (!apiKey) {
            console.warn(`API key for ${provider} is missing. Skipping.`);
            continue; // Skip if no key
        }

        try {
            const insight = await insightProviderFunctions[provider](transcript, apiKey);
            console.log(`Successfully generated insight with ${provider}`);
            return { insight, provider };
        } catch (error) {
            console.error(`Failed to generate insight with ${provider}:`, error);
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

const generateGeminiAnamnesis = async (transcript: string, anamnesisPrompt: string, apiKey: string): Promise<string> => {
    const ai = getGeminiAI(apiKey);
    const prompt = `${anamnesisPrompt}\n\nTranscrição da Consulta para Análise:\n---\n${transcript}\n---\n\nPreencha o prontuário acima com base na transcrição fornecida:`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
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


const anamnesisProviderFunctions: Record<InsightProvider, (transcript: string, anamnesisPrompt: string, apiKey: string) => Promise<string>> = {
    gemini: generateGeminiAnamnesis,
    openai: generateOpenAIAnamnesis,
    grok: generateGrokAnamnesis,
};

export const generateAnamnesisWithFailover = async (
    transcript: string,
    anamnesisPrompt: string,
    preferredProvider: InsightProvider,
    apiKeys: { openai: string; grok: string }
): Promise<{ anamnesis: string; provider: InsightProvider | null }> => {
    
    const orderedProviders = [
        preferredProvider,
        ...providerPriority.filter(p => p !== preferredProvider)
    ];

    for (const provider of orderedProviders) {
        const apiKey = provider === 'gemini' ? process.env.API_KEY : apiKeys[provider as keyof typeof apiKeys];

        if (!apiKey) {
            console.warn(`API key for ${provider} is missing. Skipping for anamnesis.`);
            continue;
        }

        try {
            const anamnesis = await anamnesisProviderFunctions[provider](transcript, anamnesisPrompt, apiKey);
            console.log(`Successfully generated anamnesis with ${provider}`);
            return { anamnesis, provider };
        } catch (error) {
            console.error(`Failed to generate anamnesis with ${provider}:`, error);
        }
    }

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