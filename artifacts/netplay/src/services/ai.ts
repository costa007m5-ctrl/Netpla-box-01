import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
  // @ts-ignore
  const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.warn("Gemini API key not found. Translation will not be available.");
}

export const translateToPortuguese = async (text: string): Promise<string> => {
  if (!text) return text;
  if (!ai) return text;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following movie/series text strictly to Brazilian Portuguese (pt-BR). Just return the translation, no extra text: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};
