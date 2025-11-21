import { GoogleGenAI } from "@google/genai";

// Ensure the API key is present. 
// Note: In a production client-side app, you'd likely proxy this through a backend to hide the key.
const API_KEY = import.meta.env.VITE_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAiPattern = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please ensure VITE_API_KEY environment variable is set.");
  }

  try {
    // Using Imagen 3 (as per guidelines, high quality)
    // If 4.0 is strictly required by task description, using that.
    // Task said: 'High-Quality Image Generation Tasks: imagen-4.0-generate-001'
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001', 
      prompt: `A high quality, seamless phone case pattern design. ${prompt}. No text, abstract or artistic style.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '9:16', // Best for phone cases
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    
    if (!base64ImageBytes) {
      throw new Error("No image generated");
    }

    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};
