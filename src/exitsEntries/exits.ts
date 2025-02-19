import { Position } from "../dataCollection/tradingEngine";
import { Indicators } from "../dataCollection/tradingEngine";
import { TradingConfig } from "../config/tradingConfigurations";

export const analyzeExit = (
    position: Position,
    indicators: Indicators,
    config: TradingConfig,
    recentClosePrice?: number,
    peakPrice?: number
  ): {shouldExit: boolean, reason: string} => {
    
    // Pull relevant data
    if (!recentClosePrice) {
      // If we can't get the current price, do nothing (hold).
      return { shouldExit: false, reason: 'No recent close price' };
    }

    const atrValue = indicators.atr;
    const atrPercent = (atrValue / recentClosePrice) * 100;
    const atrStopPercent = 2 * atrPercent; // e.g. 3 × 2% = 6%

    if (!atrValue || atrValue <= 0) {
        return { shouldExit: false, reason: 'ATR not valid' };
      }

    if (peakPrice) {
        const trailingStopPrice = peakPrice * (1 - (atrStopPercent / 100));

        // If price closes below trailingStopPrice, exit
        if (recentClosePrice < trailingStopPrice) {
            return { shouldExit: true, reason: 'trailingStopHit' };
        }
    }
    
    if (indicators.macd.shortEma < indicators.macd.longEma) {
      return { shouldExit: true, reason: 'emaCrossExit' };
    }

    const maxInitialStop = position.entryPrice - (config.stopLossPct * atrValue);
    if (recentClosePrice < maxInitialStop) {
        return { shouldExit: true, reason: 'maxInitialStopHit' };
    }
  
    return { shouldExit: false, reason: 'No signals to exit' };
  };


const adjustHoldTimeWithProfit = (baseHoldTime: number, current_pnl_percentage: number) => {
    // Assuming typical fees are around 0.1% per trade (0.2% round trip)
    const estimatedFees = 0.8;
    
    // Extend hold time if in significant profit (>3%)
    if (current_pnl_percentage > 3) {
        return baseHoldTime * 1.5;
    }
    // Reduce hold time if profit is less than fees + 1%
    if (current_pnl_percentage > 0 && current_pnl_percentage < (1 + estimatedFees)) {
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