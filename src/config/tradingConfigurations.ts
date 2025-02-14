export interface TradingConfig {
    strategyType: string;
    rsiThreshold: number;
    macdCrossNeeded: boolean;
    allowVolumeSpikes: boolean;
    dynamicStopLoss: boolean;
    stopLossPct: number;
    takeProfitPct: number;
    intervalMinutes: number;
    rsiPeriod: number;
    longEmaPeriod: number;
    shortEmaPeriod: number; 
    signalEmaPeriod: number;
    volumeSpikeBarCount: number;
    volumeSpikeFactor: number;
    volatilityLookback: number;
    max_position_size: number;
    max_positions: number; 
    maxVolatility: number;
    minAtrPercent: number;
    volatilityThreshold: number;
    maxHoldTimeMinutes: number;
    minHoldTimeMinutes: number;
    adjustHoldTimeWithVolatility: boolean;
    minimumRequiredCandles: number;
    maxAtrPercent: number | null;
    portfolio_ID: number;
}

export const meanReversionConfig: TradingConfig = {
    portfolio_ID: 4,
    strategyType: 'meanReversion',
    rsiThreshold: 25,          // More extreme oversold condition for crypto
    macdCrossNeeded: true,     // Confirm with MACD cross
    allowVolumeSpikes: true,   // Volume confirms reversal
    dynamicStopLoss: false,    
    stopLossPct: 3,            // Wider stop due to crypto volatility
    takeProfitPct: 6,          // Maintaining 2:1 ratio
    intervalMinutes: 5,        // Standard 5-minute chart
    rsiPeriod: 14,            // Standard RSI period
    longEmaPeriod: 26,
    shortEmaPeriod: 12,
    signalEmaPeriod: 9,
    volumeSpikeBarCount: 20,
    volumeSpikeFactor: 2.0,    // Crypto needs stronger volume confirmation
    volatilityLookback: 20,
    max_position_size: 0.05,   // Conservative position size
    max_positions: 5,
    maxVolatility: 3.0,        // Higher volatility tolerance
    minAtrPercent: 0.8,        // Higher minimum movement required
    volatilityThreshold: 2.0,  // Adjusted for crypto's natural volatility
    maxHoldTimeMinutes: 240,      // 4 hours
    minHoldTimeMinutes: 5,        // Minimum hold to avoid noise
    adjustHoldTimeWithVolatility: true,
    minimumRequiredCandles: 26,
    maxAtrPercent: null,
  };
  
  // Trend Following with Multiple Timeframes
  export const trendFollowingConfig: TradingConfig = {
    portfolio_ID: 2,
    strategyType: 'trendFollowing',
    rsiThreshold: 45,          // Enter as RSI crosses above 45 (momentum building)
    macdCrossNeeded: true,     // MACD cross confirms trend
    allowVolumeSpikes: true,   // Volume confirms trend
    dynamicStopLoss: true,     // ATR-based stops
    stopLossPct: 1.5,          // Base stop loss (modified by ATR)
    takeProfitPct: 4.5,        // 3:1 reward-to-risk ratio
    intervalMinutes: 15,       // Longer timeframe for trends
    rsiPeriod: 14,
    longEmaPeriod: 50,         // Longer EMAs for trend following
    shortEmaPeriod: 20,        // Wider EMA spread
    signalEmaPeriod: 9,
    volumeSpikeBarCount: 30,   // Longer volume lookback
    volumeSpikeFactor: 1.3,
    volatilityLookback: 50,    // Longer volatility lookback for trends
    max_position_size: 0.06,
    max_positions: 4,          // Fewer positions for trend following
    maxVolatility: 1.5,        // Lower volatility threshold for trends
    minAtrPercent: 0.3,        // Minimum ATR for trend confirmation
    volatilityThreshold: 1.2,  // Lower volatility requirement
    maxHoldTimeMinutes: 1440,     // 24 hours
    minHoldTimeMinutes: 30,       // Avoid quick exits in trends
    adjustHoldTimeWithVolatility: false,
    minimumRequiredCandles: 50,
    maxAtrPercent: null,
  };
  
  export const longTrendFollowingConfig: TradingConfig = {
    portfolio_ID: 3,
    strategyType: 'trendFollowing',
    rsiThreshold: 45,          // Enter as RSI crosses above 45 (momentum building)
    macdCrossNeeded: true,     // MACD cross confirms trend
    allowVolumeSpikes: true,   // Volume confirms trend
    dynamicStopLoss: true,     // ATR-based stops
    stopLossPct: 3.5,          // Wider stop for crypto trends
    takeProfitPct: 10.5,       // Crypto trends can run longer
    intervalMinutes: 30,       // Longer timeframe to filter noise
    rsiPeriod: 14,
    longEmaPeriod: 100,        // Longer EMAs to catch major trends
    shortEmaPeriod: 30,
    signalEmaPeriod: 9,
    volumeSpikeBarCount: 30,   // Longer volume lookback
    volumeSpikeFactor: 1.3,
    volatilityLookback: 50,    // Longer volatility lookback for trends
    max_position_size: 0.06,
    max_positions: 4,          // Fewer positions for trend following
    maxVolatility: 2.5,        // Higher tolerance for crypto
    minAtrPercent: 0.3,        // Minimum ATR for trend confirmation
    volatilityThreshold: 1.2,  // Lower volatility requirement
    maxHoldTimeMinutes: 1440,     // 24 hours
    minHoldTimeMinutes: 30,       // Avoid quick exits in trends
    adjustHoldTimeWithVolatility: false,
    minimumRequiredCandles: 100,
    maxAtrPercent: null,
  };
  
  // Momentum Scalping Strategy
  export const scalpingConfig: TradingConfig = {
    portfolio_ID: 1,
    strategyType: 'scalping',
    rsiThreshold: 60,          // Enter on strong momentum
    macdCrossNeeded: true,     // Quick MACD confirmation
    allowVolumeSpikes: true,   // Volume is crucial for scalping
    dynamicStopLoss: true,     
    stopLossPct: 1.0,          // Wider stops for crypto
    takeProfitPct: 2.0,        // Maintaining 2:1 ratio
    intervalMinutes: 1,        // Slightly longer for crypto
    rsiPeriod: 7,             // Faster RSI
    longEmaPeriod: 13,        // Shorter EMAs for faster signals
    shortEmaPeriod: 8,
    signalEmaPeriod: 5,
    volumeSpikeBarCount: 10,   // Quick volume confirmation
    volumeSpikeFactor: 1.8,    // Stronger volume confirmation
    volatilityLookback: 20,
    max_position_size: 0.03,   // Smaller position due to higher risk
    max_positions: 10,         // More positions due to shorter holds
    maxVolatility: 1.5,        // Adjusted up for crypto
    minAtrPercent: 0.1,        // Very small ATR requirement
    maxAtrPercent: 1.0,        // Maximum ATR for scalping
    volatilityThreshold: 0.8,  // Lower volatility for quick trades
    maxHoldTimeMinutes: 30,       // 30 minutes
    minHoldTimeMinutes: 1,        // Quick exits allowed
    adjustHoldTimeWithVolatility: true,
    minimumRequiredCandles: 13,
  };
  
  // Volatility Breakout Strategy
  export const volatilityBreakoutConfig: TradingConfig = {
    portfolio_ID: 5,
    strategyType: 'volatilityBreakout',
    rsiThreshold: 50,          // RSI used only as filter
    macdCrossNeeded: false,    // Focus on volatility, not MACD
    allowVolumeSpikes: true,   // Volume confirms breakout
    dynamicStopLoss: true,     // ATR-based stops crucial
    stopLossPct: 3.5,          // Wider stops for crypto breakouts
    takeProfitPct: 10.5,       // Crypto breakouts can be explosive
    intervalMinutes: 15,       // Changed from 10 to 15 for better breakout signals
    rsiPeriod: 14,
    longEmaPeriod: 26,
    shortEmaPeriod: 12,
    signalEmaPeriod: 9,
    volumeSpikeBarCount: 20,
    volumeSpikeFactor: 2.5,    // Very strong volume confirmation needed
    volatilityLookback: 30,    // Focus on volatility expansion
    max_position_size: 0.05,
    max_positions: 6,
    maxVolatility: 4.0,        // Much higher for crypto breakouts
    minAtrPercent: 1.5,        // Higher movement requirement
    volatilityThreshold: 2.5,  // Higher threshold for crypto
    maxHoldTimeMinutes: 360,      // 6 hours
    minHoldTimeMinutes: 5,
    adjustHoldTimeWithVolatility: true,
    minimumRequiredCandles: 26,
    maxAtrPercent: null,
  };