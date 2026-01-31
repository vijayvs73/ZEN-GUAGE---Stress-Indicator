import { getProvider } from './aiService';
import { trainModelNow } from './mlService';
import { trainTextClassifier } from './textClassifier';

export interface TrainingSummary {
  message: string;
  dataPoints: number;
  at: string;
}

const LSTM_KEY = 'zengauge_last_lstm_train';
const TEXT_KEY = 'zengauge_last_text_train';

export const getLastLstmSummary = (): TrainingSummary | null => {
  try {
    const saved = localStorage.getItem(LSTM_KEY);
    return saved ? (JSON.parse(saved) as TrainingSummary) : null;
  } catch {
    return null;
  }
};

export const getLastTextSummary = (): TrainingSummary | null => {
  try {
    const saved = localStorage.getItem(TEXT_KEY);
    return saved ? (JSON.parse(saved) as TrainingSummary) : null;
  } catch {
    return null;
  }
};

export const initModelTraining = async () => {
  try {
    await getProvider();
  } catch (e) {
    console.warn('Provider auto-detect failed:', e);
  }

  try {
    const lstmResult = await trainModelNow();
    localStorage.setItem(LSTM_KEY, JSON.stringify({
      message: lstmResult.message,
      dataPoints: lstmResult.dataPoints,
      at: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Auto LSTM training failed:', e);
  }

  try {
    const textResult = await trainTextClassifier();
    localStorage.setItem(TEXT_KEY, JSON.stringify({
      message: textResult.message,
      dataPoints: textResult.dataPoints,
      at: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Auto text training failed:', e);
  }
};
