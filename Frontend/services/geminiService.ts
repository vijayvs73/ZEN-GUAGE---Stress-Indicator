import { GoogleGenAI, Type } from "@google/genai";
import { GameResult, StressAnalysis, Message, AssessmentHistoryItem } from "../types";

// In browser: use Vite's import.meta.env (set VITE_GEMINI_API_KEY in frontend/.env)
// Vite also injects process.env via define when present
const apiKey =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.API_KEY) ||
  "";

function getClient(): GoogleGenAI | null {
  const key = String(apiKey || "").trim();
  if (!key) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch {
    return null;
  }
}

export const analyzeStress = async (results: GameResult, coords?: { latitude: number, longitude: number }): Promise<StressAnalysis> => {
  const ai = getClient();
  if (!ai) {
    return {
      stressLevel: 50,
      summary: "Set GEMINI_API_KEY in frontend/.env to enable AI analysis. Using local heuristics for now.",
      suggestions: [],
      insights: [],
    };
  }
  try {
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stressLevel: { type: Type.NUMBER, description: "A score from 0-100" },
          summary: { type: Type.STRING, description: "A personalized cognitive summary" },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['breathing', 'physical', 'mental', 'environment'] },
                duration: { type: Type.STRING }
              },
              required: ["title", "description", "type", "duration"]
            }
          }
        },
        required: ["stressLevel", "summary", "suggestions"]
      },
      tools: [{ googleMaps: {} }],
    };

    if (coords) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: coords.latitude,
            longitude: coords.longitude
          }
        }
      };
    }

    const prompt = `
      Analyze cognitive performance: 
      Reaction: ${results.reactionTime}ms, 
      Memory: ${results.memoryScore}%, 
      Speed: ${results.tappingSpeed}tps, 
      Accuracy: ${results.accuracy}%.
      
      Compare against healthy baselines (250ms, 80%, 6tps, 90%).
      Provide a structured JSON response with a stress score, a direct summary, and 3 recovery actions.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: prompt,
      config: config,
    });

    const data = JSON.parse(response.text || "{}");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const mapLinks = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        title: chunk.maps.title,
        uri: chunk.maps.uri
      }));

    return {
      stressLevel: data.stressLevel || 50,
      summary: data.summary || "Unable to generate summary.",
      suggestions: data.suggestions || [],
      insights: [],
      mapLinks
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      stressLevel: 50,
      summary: "We couldn't reach the thinking engine. Based on local heuristics, your stress appears moderate.",
      suggestions: [],
      insights: []
    };
  }
};

export const getMindsetReport = async (history: AssessmentHistoryItem[]): Promise<string> => {
  if (history.length < 2) return "Complete more assessments to generate a long-term mindset report.";
  const ai = getClient();
  if (!ai) return "Set GEMINI_API_KEY in frontend/.env to enable AI mindset reports.";

  const historyData = history.slice(0, 10).map(h => ({
    date: new Date(h.timestamp).toLocaleDateString(),
    stress: h.stressLevel,
    accuracy: h.results.accuracy
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: `Analyze this user's mental health history: ${JSON.stringify(historyData)}. 
      Identify trends, peak stress triggers, and provide a 3-sentence psychological outlook. Be supportive and clinical.`,
    });
    return response.text || "Report generated. You are showing steady progress.";
  } catch (e) {
    return "Mindset report is temporarily unavailable.";
  }
};

export const chatWithAI = async (messages: Message[]): Promise<Message> => {
  const ai = getClient();
  if (!ai) {
    return {
      role: 'model',
      content: "Set GEMINI_API_KEY in frontend/.env to use the AI chat.",
      timestamp: new Date(),
    };
  }
  const history = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: history,
      config: {
        systemInstruction: {
          parts: [{ text: "You are the ZenGauge Mindset Companion. You are a supportive, grounded, and clinical-adjacent assistant derived from cognitive behavioral therapy principles. Your goal is to help users understand their stress metrics (Stress Level, Accuracy, Reaction Time) and provide calming, actionable advice. Be concise, empathetic, and focus on immediate relief techniques (breathing, grounding) + long-term habits. Do not diagnose medical conditions." }]
        },
      },
    });

    const text = response.text || "";

    return {
      role: 'model',
      content: text,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error("Chat AI failed:", error);
    return {
      role: 'model',
      content: `I encountered an issue connecting to the AI (${error.message || "Unknown error"}). Please check your API key or internet connection.`,
      timestamp: new Date()
    };
  }
};

export const getDailyAffirmation = async (context?: { stressLevel?: number, accuracy?: number }): Promise<string> => {
  const ai = getClient();
  if (!ai) return "You possess the inner resources to handle whatever today brings.";

  let contextPrompt = "Generate a powerful, unique 1-sentence daily affirmation for someone managing their mental well-being. Modern and inspiring.";

  if (context) {
    if (context.stressLevel && context.stressLevel > 70) {
      contextPrompt = "User is high-stress. Provide a grounding, somatic affirmation about breathing and safety.";
    } else if (context.accuracy && context.accuracy > 90) {
      contextPrompt = "User is high-performance. Provide an affirmation about mental clarity and flow state.";
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: contextPrompt,
    });
    return response.text?.trim() || "You possess the inner resources to handle whatever today brings.";
  } catch (e) {
    return "Focus on your breath; the rest will follow.";
  }
};

export const findRelaxationVideos = async (queryType: string = "guided meditation"): Promise<{ title: string, uri: string }[]> => {
  const ai = getClient();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: `Find high-quality YouTube videos for: ${queryType}.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }))
      .filter(link => link.uri.includes('youtube.com') || link.uri.includes('youtu.be'));
  } catch (error) {
    return [];
  }
};

export const findNearbySupport = async (coords: { latitude: number, longitude: number }): Promise<{ title: string, uri: string }[]> => {
  const ai = getClient();
  if (!ai) {
    return [{
      title: "View Local Specialists on Maps",
      uri: `https://www.google.com/maps/search/psychiatrist/@${coords.latitude},${coords.longitude},13z`
    }];
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: "Find mental health support near me.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: coords.latitude,
              longitude: coords.longitude
            }
          }
        }
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const results = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        title: chunk.maps.title,
        uri: chunk.maps.uri
      }));

    if (results.length === 0) {
      return [{
        title: "View Local Specialists on Maps",
        uri: `https://www.google.com/maps/search/psychiatrist/@${coords.latitude},${coords.longitude},13z`
      }];
    }
    return results;
  } catch (error) {
    return [{
      title: "View Local Specialists on Maps",
      uri: `https://www.google.com/maps/search/psychiatrist/@${coords.latitude},${coords.longitude},13z`
    }];
  }
};

export const generateZenImage = async (mood: string): Promise<string | null> => {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'imagen-3.0-generate-001',
      contents: {
        parts: [{ text: `A photorealistic zen landscape: ${mood}. Cinematic, therapeutic.` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
