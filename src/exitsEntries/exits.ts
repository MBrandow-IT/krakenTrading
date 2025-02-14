import { Position } from "../dataCollection/tradingEngine";
import { Indicators } from "../dataCollection/tradingEngine";
import { TradingConfig } from "../config/tradingConfigurations";

export const analyzeExit = (position: Position, indicators: Indicators, config: TradingConfig, recentClosePrice?: number): {shouldExit: boolean, reason: string} => {
    const { entryPrice, entryTime } = position;

    if (!recentClosePrice) {
        return {shouldExit: false, reason: 'holdTime'};
    }

    const current_pnl_percentage = ((recentClosePrice - entryPrice) / entryPrice) * 100;

    const holdTimeMinutes = (new Date().getTime() - new Date(entryTime).getTime()) / (1000 * 60);
    
    const baseHoldTime = config.maxHoldTimeMinutes;
    const adjustedHoldTime = adjustHoldTimeWithProfit(baseHoldTime, current_pnl_percentage);

    const maxHoldTime = config.adjustHoldTimeWithVolatility 
      ? getDynamicMaxHoldTime(adjustedHoldTime, indicators)
      : adjustedHoldTime;

    // Check minimum hold time
    if (holdTimeMinutes < config.minHoldTimeMinutes) {
        return {shouldExit: false, reason: 'holdTime'};
    }

    if (holdTimeMinutes >= maxHoldTime) {
        return {shouldExit: true, reason: 'holdTime'};
    }

    const dynamicStopLoss = config.dynamicStopLoss || false;

    let stopLossPct = config.stopLossPct || 1.5;
    let takeProfitPct = config.takeProfitPct || 2.5;

    if (dynamicStopLoss) {
        const atrPercent = (indicators.atr/recentClosePrice)*100;
        stopLossPct = Math.max(3*atrPercent, config.stopLossPct);
        takeProfitPct = Math.max(6*atrPercent, config.takeProfitPct);
    }

    if (current_pnl_percentage >= takeProfitPct) {
        return {shouldExit: true, reason: 'takeProfit'};
    }

    if (current_pnl_percentage <= -stopLossPct) {
        return {shouldExit: true, reason: 'stopLoss'};
    }

    return {shouldExit: false, reason: 'holdTime'};
}


const adjustHoldTimeWithProfit = (baseHoldTime: number, current_pnl_percentage: number) => {
    // Extend hold time if in significant profit (>3%)
    if (current_pnl_percentage > 3) {
        return baseHoldTime * 1.5;
    }
    // Reduce hold time if barely profitable (<1%)
    if (current_pnl_percentage > 0 && current_pnl_percentage < 1) {
        return baseHoldTime * 0.7;
    }
    return baseHoldTime;
};

const getDynamicMaxHoldTime = (baseHoldTime: number, indicators: Indicators) => {
    let multiplier = 1;

    // Reduce hold time in high volatility
    if (indicators.volatilitySpike) {
        multiplier *= 0.7;
    }

    // Extend hold time in strong trends (using MACD)
    if (Math.abs(indicators.macd.macd) > Math.abs(indicators.macd.signal) * 2) {
        multiplier *= 1.3;
    }

    // Reduce hold time if volume is dropping
    if (!indicators.volumeSpike) {
        multiplier *= 0.9;
    }

    return Math.floor(baseHoldTime * multiplier);
};