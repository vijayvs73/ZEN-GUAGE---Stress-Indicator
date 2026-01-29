
import React, { useMemo } from 'react';
import { AssessmentHistoryItem } from '../types';
import { burnoutForecaster } from '../services/mlService';
import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
    history: AssessmentHistoryItem[];
}

const BurnoutRiskWidget: React.FC<Props> = ({ history }) => {
    const { risk, trend } = useMemo(() => {
        return burnoutForecaster.predictRisk(history);
    }, [history]);

    const getRiskColor = (r: number) => {
        if (r < 30) return 'text-emerald-500';
        if (r < 70) return 'text-amber-500';
        return 'text-red-500';
    };

    const getRiskBg = (r: number) => {
        if (r < 30) return 'bg-emerald-50';
        if (r < 70) return 'bg-amber-50';
        return 'bg-red-50';
    };

    const trendIcon = () => {
        if (trend === 'up') return <TrendingUp size={16} className="text-red-500" />;
        if (trend === 'down') return <TrendingDown size={16} className="text-emerald-500" />;
        return <Minus size={16} className="text-slate-400" />;
    };

    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl ${getRiskBg(risk)}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${getRiskColor(risk)}`}>
                    <Activity size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forecast</p>
                    <h4 className={`font-black text-lg ${getRiskColor(risk)}`}>
                        {risk.toFixed(1)}% Risk
                    </h4>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    Trend {trendIcon()}
                </span>
                <span className="text-[10px] text-slate-400">Based on recent history</span>
            </div>
        </div>
    );
};

export default BurnoutRiskWidget;
