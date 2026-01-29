
import * as Gemini from './geminiService';
import * as Ollama from './ollamaService';
import { AssessmentHistoryItem, GameResult, Message, StressAnalysis } from '../types';

export const getProvider = () => {
    return localStorage.getItem('zengauge_ai_provider') === 'ollama' ? Ollama : Gemini;
};

export const analyzeStress = async (results: GameResult, coords?: { latitude: number, longitude: number }): Promise<StressAnalysis> => {
    return await getProvider().analyzeStress(results, coords);
};

export const getMindsetReport = async (history: AssessmentHistoryItem[]): Promise<string> => {
    return await getProvider().getMindsetReport(history);
};

export const chatWithAI = async (messages: Message[]): Promise<Message> => {
    return await getProvider().chatWithAI(messages);
};

export const getDailyAffirmation = async (context?: { stressLevel?: number, accuracy?: number }): Promise<string> => {
    return await getProvider().getDailyAffirmation(context);
};

export const findRelaxationVideos = async (queryType?: string): Promise<{ title: string, uri: string }[]> => {
    return await getProvider().findRelaxationVideos(queryType);
};

// Fallback to AI provider or generic link if OSM fails
const getFallbackSupport = (coords: { latitude: number, longitude: number }) => {
    return [
        {
            title: "Open Google Maps Search",
            uri: `https://www.google.com/maps/search/psychiatrist/@${coords.latitude},${coords.longitude},13z`
        },
        {
            title: "Find A Helpline",
            uri: "https://findahelpline.com/"
        }
    ];
};

export const findNearbySupport = async (coords: { latitude: number, longitude: number }): Promise<{ title: string, uri: string }[]> => {
    try {
        // Try OpenStreetMap (Nominatim) first for direct listing
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=psychiatrist+mental+health&limit=10&lat=${coords.latitude}&lon=${coords.longitude}&bounded=1`,
            { headers: { 'Accept-Language': 'en-US' } }
        );

        if (!response.ok) throw new Error('OSM Lookup failed');

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            return data.map((place: any) => ({
                title: place.name || place.display_name.split(',')[0], // Try to get a clean name
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.display_name)}&query_place_id=${place.place_id}`
                // Or just use OSM link: `https://www.openstreetmap.org/node/${place.osm_id}`
                // But Google Maps is often more useful for directions.
            }));
        }

        // If no results from OSM, fall back to provider or generic
        return getFallbackSupport(coords);
    } catch (e) {
        console.warn("Location fetch failed, falling back", e);
        return getFallbackSupport(coords);
    }
};

const FALLBACK_SCENES: Record<string, string> = {
    'Deep Calm': 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1920&q=80', // Mist over water
    'Cosmic Peace': 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=80', // Starry sky
    'Lush Forest': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80', // Forest sunlight
    'Desert Stillness': 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1920&q=80', // Desert
    'default': 'https://images.unsplash.com/photo-1528353518132-13119849add2?auto=format&fit=crop&w=1920&q=80' // Zen stones
};

export const generateZenImage = async (mood: string): Promise<string | null> => {
    try {
        // Try the active provider first
        const image = await getProvider().generateZenImage(mood);
        if (image) return image;

        // Fallback if AI returns null (common with Ollama or limited keys)
        // Match partial mood strings to our keys
        if (mood.includes('water') || mood.includes('lake')) return FALLBACK_SCENES['Deep Calm'];
        if (mood.includes('nebula') || mood.includes('colors')) return FALLBACK_SCENES['Cosmic Peace'];
        if (mood.includes('forest') || mood.includes('moss')) return FALLBACK_SCENES['Lush Forest'];
        if (mood.includes('sand') || mood.includes('dunes')) return FALLBACK_SCENES['Desert Stillness'];

        return FALLBACK_SCENES['default'];
    } catch (e) {
        return FALLBACK_SCENES['default'];
    }
};
