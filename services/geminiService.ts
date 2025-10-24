import { GoogleGenAI } from "@google/genai";
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
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
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
    // NOTE: This is a hypothetical implementation based on common API patterns.
    // The actual Grok API endpoint and request structure may differ.
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


export const generateInsights = async (transcript: string, provider: InsightProvider, apiKey: string): Promise<string> => {
    try {
        switch (provider) {
            case 'openai':
                return await generateOpenAIInsight(transcript, apiKey);
            case 'grok':
                return await generateGrokInsight(transcript, apiKey);
            case 'gemini':
            default:
                return await generateGeminiInsight(transcript, apiKey);
        }
    } catch (error) {
        console.error(`Error calling ${provider} API for insights:`, error);
        return `Não foi possível gerar um insight de ${provider} neste momento.`;
    }
};


export const generateAnamnesis = async (transcript: string, anamnesisPrompt: string): Promise<string> => {
    const ai = getGeminiAI(); // Anamnesis continues to use Gemini
    
    const prompt = `${anamnesisPrompt}

Transcrição da Consulta para Análise:
---
${transcript}
---

Preencha o prontuário acima com base na transcrição fornecida:
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for anamnesis:", error);
        return "Erro ao atualizar a anamnese.";
    }
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for better analysis
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for daily summary:", error);
        return "Ocorreu um erro ao tentar gerar as ideias para posts.";
    }
};