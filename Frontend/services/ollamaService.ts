
import { GameResult, StressAnalysis, Message, AssessmentHistoryItem } from "../types";

import { mindsetLearner } from './mlService';

const OLLAMA_API_URL = "http://localhost:11434/api";
const MODEL_NAME = "llama3";

const getSystemPrompt = () => `You are the ZenGauge Offline AI. You are a supportive, grounded, and clinical-adjacent assistant. 
Your goal is to help users understand their stress metrics. Be concise, empathetic, and focus on immediate relief techniques.
${mindsetLearner.getContextPrompt()}`;

async function queryOllama(endpoint: string, body: any) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Ollama connection failed');
        return await response.json();
    } catch (error) {
        console.error("Ollama API Error:", error);
        throw error;
    }
}

export const analyzeStress = async (results: GameResult, coords?: { latitude: number, longitude: number }): Promise<StressAnalysis> => {
    try {
        const prompt = `
      Analyze cognitive performance: 
      Reaction: ${results.reactionTime}ms, 
      Memory: ${results.memoryScore}%, 
      Speed: ${results.tappingSpeed}tps, 
      Accuracy: ${results.accuracy}%.
      
      Compare against healthy baselines (250ms, 80%, 6tps, 90%).
      Return a VALID JSON object with:
      - stressLevel (number 0-100)
      - summary (string)
      - suggestions (array of 3 objects with title, description, type (breathing|physical|mental|environment), duration)
      
      Do not include any markdown formatting like \`\`\`json. Just the raw JSON string.
    `;

        const data = await queryOllama('/generate', {
            model: MODEL_NAME,
            prompt: prompt,
            system: getSystemPrompt(),
            stream: false,
            format: "json"
        });

        const parsed = JSON.parse(data.response);

        return {
            stressLevel: parsed.stressLevel || 50,
            summary: parsed.summary || "Analysis complete.",
            suggestions: parsed.suggestions || [],
            insights: [],
            mapLinks: []
        };
    } catch (error) {
        return {
            stressLevel: 50,
            summary: "Offline analysis failed. Ensure Ollama is running.",
            suggestions: [],
            insights: []
        };
    }
};

export const getMindsetReport = async (history: AssessmentHistoryItem[]): Promise<string> => {
    if (history.length < 2) return "Complete more assessments to generate a report.";

    const historyData = history.slice(0, 10).map(h => ({
        date: new Date(h.timestamp).toLocaleDateString(),
        stress: h.stressLevel,
        accuracy: h.results.accuracy
    }));

    try {
        const data = await queryOllama('/generate', {
            model: MODEL_NAME,
            prompt: `Analyze this mental health history: ${JSON.stringify(historyData)}. Identify trends and provide a 3-sentence outlook.`,
            system: getSystemPrompt(),
            stream: false
        });
        return data.response;
    } catch (e) {
        return "Offline report unavailable.";
    }
};

export const chatWithAI = async (messages: Message[]): Promise<Message> => {
    // Convert messages to Ollama chat format
    const chatMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content
    }));

    try {
        const data = await queryOllama('/chat', {
            model: MODEL_NAME,
            messages: chatMessages,
            stream: false
        });

        return {
            role: 'model',
            content: data.message.content,
            timestamp: new Date()
        };
    } catch (error) {
        return {
            role: 'model',
            content: "I can't connect to your local Ollama instance. Is it running?",
            timestamp: new Date()
        };
    }
};

export const getDailyAffirmation = async (context?: { stressLevel?: number, accuracy?: number }): Promise<string> => {
    try {
        const data = await queryOllama('/generate', {
            model: MODEL_NAME,
            prompt: "Generate a short, powerful daily affirmation for mental resilience.",
            stream: false
        });
        return data.response.trim();
    } catch (e) {
        return "You are strong and capable.";
    }
};

// Stubs for features requiring online access
export const findRelaxationVideos = async (): Promise<{ title: string, uri: string }[]> => {
    return [
        { title: "Box Breathing (Offline Guide)", uri: "#" },
        { title: "Progressive Muscle Relaxation (Offline)", uri: "#" }
    ];
};

export const findNearbySupport = async (): Promise<{ title: string, uri: string }[]> => {
    return [];
};

export const generateZenImage = async (): Promise<string | null> => {
    return null;
};
