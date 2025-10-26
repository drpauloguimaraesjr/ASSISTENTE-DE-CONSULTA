// This service contains functions to validate API keys for external providers.

/**
 * Validates an OpenAI API key by making a simple, low-cost API call.
 * @param apiKey The OpenAI API key to validate.
 * @returns A boolean indicating if the key is valid.
 */
export const validateOpenAIApiKey = async (apiKey: string): Promise<boolean> => {
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.status === 401) {
            throw new Error("Chave de API inválida ou expirada.");
        }
        
        if (!response.ok) {
            throw new Error(`A API retornou um erro: ${response.statusText}`);
        }
        
        // If we get a successful response, the key is valid.
        return true;

    } catch (error: any) {
        console.error("OpenAI API key validation failed:", error);
        // Re-throw the specific error message for the UI
        throw error;
    }
};

/**
 * Validates a Grok (xAI) API key.
 * NOTE: This uses a placeholder endpoint and logic. This should be updated
 * when the actual Grok API is available and provides a simple validation endpoint.
 * @param apiKey The Grok API key to validate.
 * @returns A boolean indicating if the key is valid.
 */
export const validateGrokApiKey = async (apiKey: string): Promise<boolean> => {
    try {
        const response = await fetch("https://api.x.ai/v1/models", { // Using a models endpoint, similar to OpenAI
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.status === 401) {
            throw new Error("Chave de API inválida ou não autorizada.");
        }

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             const errorMessage = errorData?.error?.message || response.statusText;
            throw new Error(`A API retornou um erro: ${errorMessage}`);
        }
        
        return true;

    } catch (error: any) {
        console.error("Grok API key validation failed:", error);
        throw error;
    }
};
