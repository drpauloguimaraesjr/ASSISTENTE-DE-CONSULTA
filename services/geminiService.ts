import { GoogleGenAI } from "@google/genai";

const getAi = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateInsights = async (transcript: string): Promise<string> => {
    const ai = getAi();
    
    const prompt = `Você é um assistente de IA em uma consulta médica em tempo real. Com base na transcrição a seguir, gere um pensamento breve e perspicaz, uma conexão potencial ou os próximos passos, como se fosse o monólogo interior ou 'fluxo de consciência' do médico. Não repita a transcrição. Concentre-se na interpretação e síntese. Mantenha cada pensamento em um único ponto curto. A parte mais recente da conversa é a mais importante.

Transcrição:
---
${transcript}
---

Insight Curto:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for insights:", error);
        return "Não foi possível gerar um insight neste momento.";
    }
};


export const generateAnamnesis = async (transcript: string, anamnesisPrompt: string): Promise<string> => {
    const ai = getAi();
    
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

    const ai = getAi();
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
