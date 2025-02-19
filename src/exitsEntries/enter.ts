import { TradingConfig } from "../config/tradingConfigurations";
import { Indicators } from "../dataCollection/tradingEngine";


export const analyzeEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice: number): { shouldEnter: boolean, reason: string } => {

    const result = entranceStrategy(indicator, config, recentClosePrice);
    return result;
}

export const entranceStrategy = (indicator: Indicators, config: TradingConfig, recentClosePrice: number): { shouldEnter: boolean, reason: string } => {
    const strategyType = config.strategyType || 'meanReversion'; // Default strategy

  switch(strategyType) {
    // case 'meanReversion':
    //   return meanReversionEntry(indicator, config, recentClosePrice);
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

// const meanReversionEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice?: number) => {
  
//   // Check for oversold conditions with configurable threshold
//   if (indicator.rsi < config.rsiThreshold) {
//     // Ensure RSI is starting to turn up (momentum shift)
//     const rsiIncreasing = indicator.rsi > indicator.previousRsi;
    
//     // Multiple confirmations for stronger entry signals
//     const macdConfirmation = indicator.macd.macd > indicator.macd.signal && 
//                             indicator.macd.histogram > indicator.previousMacd.histogram;
    
//     // Price should be near or below a moving average for mean reversion
//     const priceNearMA = recentClosePrice <= indicator.sma200 * 1.02; // Within 2% of SMA
    
//     if (rsiIncreasing && macdConfirmation && priceNearMA) {
//       // Volume confirmation with trending volume
//       if (indicator.volumeSpike) {
//         return {
//           shouldEnter: true,
//           reason: `Mean reversion entry: RSI=${indicator.rsi.toFixed(2)} (recovering), ` +
//                  `MACD improving, Price near MA, Volume confirmed`,
//           position: 'long',
//           entry_price: recentClosePrice,
//         };
//       }
//       console.log('Failed volume confirmation');
//     }
//   }
//   return { shouldEnter: false, reason: 'Mean reversion conditions not met' };
// };

const trendFollowingEntry = (indicator: Indicators, config: TradingConfig, recentClosePrice?: number) => {
  
//   console.log('indicator.rsi.currentRsi', indicator.rsi.currentRsi, 'indicator.rsi.previousRsi', indicator.rsi.previousRsi, 'config.rsiThreshold', config.rsiThreshold)
//   console.log('indicator.macd.longEma', indicator.macd.longEma, 'indicator.macd.shortEma', indicator.macd.shortEma)
  // Check for upward trend using RSI
  if (indicator.rsi.currentRsi > config.rsiThreshold && indicator.rsi.currentRsi < 70 && indicator.rsi.previousRsi < config.rsiThreshold) {
    // Strong trend confirmation with MACD
    // 1. MACD line is above Signal line (positive momentum)
    // 2. MACD line is above 0 (bullish territory)
    // 3. Histogram is positive and growing (increasing momentum)
    if (indicator.macd.macd > indicator.macd.signal && // MACD crossover
        indicator.macd.macd > 0 &&                     // Bullish territory
        indicator.macd.shortEma > indicator.macd.longEma 
        && indicator.macd.histogram > 0) {                // Positive momentum
      
      // Ensure we're not in high volatility
      if (!indicator.volatilitySpike) {
        return {
          shouldEnter: true,
          reason: `Trend following entry: Indicators: ${JSON.stringify(indicator)}`,
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
  if (indicator.rsi.currentRsi > config.rsiThreshold) {
    if (indicator.macd.macd > indicator.macd.signal && indicator.macd.macd > 0) {
      // Volume confirmation is crucial for scalping
      if (indicator.volumeSpike) {
        // ATR check for volatility
        const atrPercent = (indicator.atr / recentClosePrice) * 100;
        if (atrPercent > 0.1 && atrPercent < 1.0) { // Reasonable volatility range
          return {
            shouldEnter: true,
            reason: `Scalp entry: RSI=${indicator.rsi.currentRsi.toFixed(2)}, Volume spike confirmed`,
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
    if (indicator.rsi.currentRsi > 40 && indicator.rsi.currentRsi < 60) {
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