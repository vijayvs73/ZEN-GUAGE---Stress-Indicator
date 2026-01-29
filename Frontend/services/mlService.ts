
import * as tf from '@tensorflow/tfjs';
import { GameResult, AssessmentHistoryItem } from '../types';

// Storage keys
const STRESS_MODEL_KEY = 'zengauge_stress_model';
const STRESS_DATA_KEY = 'zengauge_stress_data';
const PREFS_KEY = 'zengauge_ai_prefs';

// --- Types ---
export interface TrainingDataPoint {
    inputs: number[]; // [reaction, memory, tapping, accuracy]
    label: number;    // user reported stress (0-1)
    timestamp: number;
}

// --- Model 1: Personalized Stress Forecaster (LSTM) ---
// Uses Time-Series data (sequence of recent games) to predict stress.
const WINDOW_SIZE = 3; // Look at last 3 games

class StressLSTM {
    private model: tf.Sequential;
    private isTrained = false;

    constructor() {
        this.model = tf.sequential();

        // LSTM Layer
        // Input Shape: [BatchSize, TimeSteps, Features]
        // TimeSteps = 3 (Last 3 games)
        // Features = 4 (Reaction, Memory, Tapping, Accuracy)
        this.model.add(tf.layers.lstm({
            units: 32,
            returnSequences: false,
            inputShape: [WINDOW_SIZE, 4]
        }));

        // Output Layer (Regression 0-1)
        this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

        this.model.compile({
            optimizer: tf.train.adam(0.005),
            loss: 'meanSquaredError'
        });
    }

    async load() {
        try {
            const saved = await tf.loadLayersModel('localstorage://' + STRESS_MODEL_KEY);
            this.model = saved as tf.Sequential;
            this.model.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError' });
            this.isTrained = true;
            console.log("ML: LSTM Model loaded");
        } catch (e) {
            console.log("ML: No LSTM found. Seeding synthetic sequential data...");
            await this.seedDefaultData();
        }
    }

    /** Public: seed synthetic data and train (use when no/insufficient data). */
    async seedAndTrain() {
        await this.seedDefaultData();
    }

    async seedDefaultData() {
        // Generate a sequence where stress gradually increases then decreases
        const syntheticData: TrainingDataPoint[] = [];
        const sequenceLength = 50;

        for (let i = 0; i < sequenceLength; i++) {
            // Simulate a "stress wave" using sine
            const stressWave = (Math.sin(i * 0.2) + 1) / 2; // 0 to 1

            // Generate metrics correlated with this stress wave
            // High stress = High Reaction, Low Memory
            const reaction = 250 + (stressWave * 200) + (Math.random() * 50);
            const memory = 80 - (stressWave * 40) + (Math.random() * 10);
            const tapping = 8 - (stressWave * 4) + (Math.random() * 1);
            const accuracy = 95 - (stressWave * 20) + (Math.random() * 5);

            syntheticData.push({
                inputs: [reaction, memory, tapping, accuracy],
                label: stressWave,
                timestamp: Date.now() - ((sequenceLength - i) * 86400000)
            });
        }

        localStorage.setItem(STRESS_DATA_KEY, JSON.stringify(syntheticData));
        await this.train(syntheticData);
        console.log("ML: LSTM seeded with sequential pattern.");
    }

    async train(data: TrainingDataPoint[]) {
        if (data.length < WINDOW_SIZE + 2) return;

        // Create Sliding Windows
        // X: [[t1, t2, t3], [t2, t3, t4]...]
        // Y: [label4, label5...]
        const X = [];
        const Y = [];

        // Normalize Data first
        const normalized = data.map(d => [
            d.inputs[0] / 1000,
            d.inputs[1] / 100,
            d.inputs[2] / 15,
            d.inputs[3] / 100
        ]);

        for (let i = 0; i < normalized.length - WINDOW_SIZE; i++) {
            const window = normalized.slice(i, i + WINDOW_SIZE);
            const targetLabel = data[i + WINDOW_SIZE].label;
            X.push(window); // Shape: [3, 4]
            Y.push(targetLabel);
        }

        const xs = tf.tensor3d(X); // [Batch, 3, 4]
        const ys = tf.tensor2d(Y, [Y.length, 1]);

        console.log(`ML: Training LSTM on ${X.length} sequences...`);
        await this.model.fit(xs, ys, {
            epochs: 30,
            batchSize: 4,
            shuffle: true // Shuffle windows, not internal sequence
        });

        this.isTrained = true;
        await this.model.save('localstorage://' + STRESS_MODEL_KEY);

        xs.dispose();
        ys.dispose();
    }

    // Input: The FULL history (we will slice the last few items)
    predict(history: AssessmentHistoryItem[], currentResult: GameResult): number | null {
        if (!this.isTrained) return null;

        // We need the last (WINDOW_SIZE - 1) items + currentResult to make a window of 3
        const needed = WINDOW_SIZE - 1;
        if (history.length < needed) return null; // Not enough history for LSTM context

        return tf.tidy(() => {
            // Get last few historical inputs
            const pastInputs = history.slice(-needed).map(h => [
                (h.results.reactionTime || 500) / 1000,
                (h.results.memoryScore || 0) / 100,
                (h.results.tappingSpeed || 0) / 15,
                (h.results.accuracy || 0) / 100
            ]);

            // Add current
            const currentInput = [
                (currentResult.reactionTime || 500) / 1000,
                (currentResult.memoryScore || 0) / 100,
                (currentResult.tappingSpeed || 0) / 15,
                (currentResult.accuracy || 0) / 100
            ];

            const sequence = [...pastInputs, currentInput]; // Shape [3, 4]
            const inputTensor = tf.tensor3d([sequence]); // Shape [1, 3, 4]

            const prediction = this.model.predict(inputTensor) as tf.Tensor;
            return (prediction.dataSync()[0]) * 100;
        });
    }
}

// --- Model 2: Burnout Risk Forecaster (Time-Series Heuristics) ---
// Note: True LSTM implies complex data pipelines. For client-side, 
// a weighted trend analysis is often more robust for small datasets (<100 points).
class BurnoutForecaster {
    predictRisk(history: AssessmentHistoryItem[]): { risk: number, trend: 'up' | 'down' | 'stable' } {
        if (history.length < 3) return { risk: 0, trend: 'stable' };

        // Sort by date ascending
        const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const recent = sorted.slice(-5); // Look at last 5 sessions

        // Calculate Trend using Linear Regression on Stress Levels
        const x = recent.map((_, i) => i);
        const y = recent.map(h => h.stressLevel);

        // Simple slope calculation
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((((a, i) => a + i * y[i]) as any), 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        // Burnout Risk = (Current Stress * 0.6) + (Slope * 20)
        // If stress is high AND rising, risk is very high.
        const currentStress = y[y.length - 1];
        let risk = (currentStress * 0.7) + (slope * 150); // Amplify slope impact
        risk = Math.max(0, Math.min(100, risk));

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (slope > 0.05) trend = 'up';
        if (slope < -0.05) trend = 'down';

        return { risk, trend };
    }
}

// --- Model 3: "Mindset" User Learning (Preference Storage) ---
// "Training" the Chatbot by accumulating user context.
class MindsetLearner {
    private preferences: string[] = [];

    constructor() {
        const saved = localStorage.getItem(PREFS_KEY);
        if (saved) this.preferences = JSON.parse(saved);
    }

    learn(topic: string, preference: string) {
        const entry = `${topic}: ${preference}`;
        if (!this.preferences.includes(entry)) {
            this.preferences.push(entry);
            localStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences));
        }
    }

    getContextPrompt(): string {
        if (this.preferences.length === 0) return "";
        return `\n\nUSER PREFERENCES (LEARNED from previous chats):\n${this.preferences.map(p => `- ${p}`).join('\n')}\nAdjust your personality and advice accordingly.`;
    }
}

// --- Singleton Exports ---
export const stressPredictor = new StressLSTM();
export const burnoutForecaster = new BurnoutForecaster();
export const mindsetLearner = new MindsetLearner();

// Init
stressPredictor.load();

/** Run training now: use stored data or seed synthetic data, then train and save. */
export async function trainModelNow(): Promise<{ success: boolean; message: string; dataPoints: number }> {
    const raw = localStorage.getItem(STRESS_DATA_KEY);
    const data: TrainingDataPoint[] = raw ? JSON.parse(raw) : [];

    if (data.length < WINDOW_SIZE + 2) {
        await stressPredictor.seedAndTrain();
        const after = JSON.parse(localStorage.getItem(STRESS_DATA_KEY) || '[]');
        return { success: true, message: 'Model trained on synthetic data (not enough history yet).', dataPoints: after.length };
    }

    await stressPredictor.train(data);
    return { success: true, message: 'Model retrained on your assessment history.', dataPoints: data.length };
}

// Helper to save data point
export const saveTrainingData = (result: GameResult, userReportedStress: number) => {
    const currentData = JSON.parse(localStorage.getItem(STRESS_DATA_KEY) || '[]');

    // Inputs must be ordered: [reaction, memory, tapping, accuracy]
    const newItem: TrainingDataPoint = {
        inputs: [
            result.reactionTime || 0,
            result.memoryScore || 0,
            result.tappingSpeed || 0,
            result.accuracy || 0
        ],
        label: userReportedStress / 100, // Normalize to 0-1
        timestamp: Date.now()
    };

    currentData.push(newItem);
    localStorage.setItem(STRESS_DATA_KEY, JSON.stringify(currentData));

    // Retrain every 3rd data point or so
    stressPredictor.train(currentData);
};
