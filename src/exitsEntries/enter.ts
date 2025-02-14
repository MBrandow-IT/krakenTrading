import { TradingConfig } from "../config/tradingConfigurations";
import { Indicators } from "../dataCollection/tradingEngine";


export const analyzeEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice: number): { shouldEnter: boolean, reason: string } => {

    const result = entranceStrategy(indicator, config, recentClosePrice);
    return result;
}

export const entranceStrategy = (indicator: Indicators, config: TradingConfig, recentClosePrice: number): { shouldEnter: boolean, reason: string } => {
    const strategyType = config.strategyType || 'meanReversion'; // Default strategy

  switch(strategyType) {
    case 'meanReversion':
      return meanReversionEntry(indicator, config, recentClosePrice);
    case 'trendFollowing':
      return trendFollowingEntry(indicator, config, recentClosePrice);
    case 'scalping':
      return scalpingEntry(indicator, config, recentClosePrice);
    case 'volatilityBreakout':
      return volatilityBreakoutEntry(indicator, config, recentClosePrice);
    default:
      return { shouldEnter: false, reason: 'No valid strategy type specified' };
  }
};

const meanReversionEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice?: number) => {
  
  // Buy when RSI is oversold and starting to recover
  if (indicator.rsi < config.rsiThreshold) {
    // Check for MACD confirmation of reversal if needed
    if (!config.macdCrossNeeded || 
        (indicator.macd && 
         (indicator.macd.macd > indicator.macd.signal || indicator.macd.histogram > 0))) {  // More lenient MACD check
      // Volume should be above average for reversal confirmation
      if (!config.allowVolumeSpikes || indicator.volumeSpike) {
        return {
          shouldEnter: true,
          reason: `Mean reversion entry: RSI=${indicator.rsi.toFixed(2)} (oversold), MACD: ${indicator.macd.macd.toFixed(2)}, Signal: ${indicator.macd.signal.toFixed(2)}, Histogram: ${indicator.macd.histogram.toFixed(2)}`,
          position: 'long',
          entry_price: recentClosePrice,
        };
      }
      console.log('Failed volume check');
    }
  }
  return { shouldEnter: false, reason: 'Mean reversion conditions not met' };
};

const trendFollowingEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice?: number) => {
  
  // Remove duplicate RSI check
  if (indicator.rsi > config.rsiThreshold && indicator.rsi < 70) {
    // Strong trend confirmation with MACD
    if (indicator.macd.macd > indicator.macd.signal && 
        indicator.macd.histogram > 0 && 
        indicator.macd.macd > 0) {
      // Ensure we're not in high volatility
      if (indicator.volatilitySpike) {
        return {
          shouldEnter: true,
          reason: `Trend following entry: RSI=${indicator.rsi.toFixed(2)}, MACD trending up ${indicator.macd.macd.toFixed(2)} ${indicator.macd.signal.toFixed(2)} ${indicator.macd.histogram.toFixed(2)}`,
          position: 'long',
          entry_price: recentClosePrice,
        };
      }
    }
  }
  return { shouldEnter: false, reason: 'Trend following conditions not met' };
};

const scalpingEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice: number) => {
  
  // Quick momentum trades with tight parameters
  if (indicator.rsi > config.rsiThreshold && indicator.rsi < 75) {
    if (indicator.macd.macd > indicator.macd.signal) {
      // Volume confirmation is crucial for scalping
      if (indicator.volumeSpike) {
        // ATR check for volatility
        const atrPercent = (indicator.atr / recentClosePrice) * 100;
        if (atrPercent > 0.1 && atrPercent < 1.0) { // Reasonable volatility range
          return {
            shouldEnter: true,
            reason: `Scalp entry: RSI=${indicator.rsi.toFixed(2)}, Volume spike confirmed`,
            position: 'long',
            entry_price: recentClosePrice,
          };
        }
      }
    }
  }
  return { shouldEnter: false, reason: 'Scalping conditions not met' };
};

const volatilityBreakoutEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice: number) => {
  
  if (indicator.volumeSpike && (indicator.volatilitySpike)) {

    console.log('indicator.rsi', indicator.rsi)
    // Use RSI as a filter only
    if (indicator.rsi > 40 && indicator.rsi < 60) {
      // ATR for position sizing and stop placement
      const atrPercent = (indicator.atr / recentClosePrice) * 100;
      if (atrPercent > config.minAtrPercent) {
        return {
          shouldEnter: true,
          reason: `Volatility breakout: ATR=${atrPercent.toFixed(2)}%, Volume confirmed`,
          position: 'long',
          entry_price: recentClosePrice,
        };
        };
      }
    }
    return { shouldEnter: false, reason: 'Volatility breakout conditions not met' };
  }