export interface TradingConfig {
  strategyType: string; // The name of the strategy, meanReversion, trendFollowing, scalping, volatilityBreakout see enter.ts for more details.
  rsiThreshold: number; // The RSI threshold for the strategy
  macdCrossNeeded: boolean; // Whether the strategy requires a MACD cross
  allowVolumeSpikes: boolean; // Whether the strategy allows volume spikes
  dynamicStopLoss: boolean; // Whether the strategy uses a dynamic stop loss
  stopLossPct: number; // The stop loss percentage, if dynamicStopLoss is true, this will be the lowest stop loss percentage
  takeProfitPct: number; // The take profit percentage, if dynamicTakeProfit is true, this will be the lowest take profit percentage
  intervalMinutes: number; // The interval of your candles in minutes
  rsiPeriod: number; // The RSI period, this is the period of the RSI indicator
  longEmaPeriod: number; // The long EMA period, this is the period of the long EMA indicator
  shortEmaPeriod: number; // The short EMA period, this is the period of the short EMA indicator
  signalEmaPeriod: number; // The signal EMA period, this is the period of the signal EMA indicator
  volumeSpikeBarCount: number; // The number of bars to look back for volume spikes
  volumeSpikeFactor: number; // The factor of the volume spike, this is the factor of the volume spike indicator
  volatilityLookback: number; // The lookback period for the volatility indicator
  max_position_size: number; // The maximum position size, this is the maximum position size of the strategy
  max_positions: number; // The maximum number of positions, this is the maximum number of positions of the strategy
  maxVolatility: number; // The maximum volatility, this is the maximum volatility of the strategy
  minAtrPercent: number; // The minimum ATR percentage, this is the minimum ATR percentage of the strategy
  volatilityThreshold: number; // The volatility threshold, this is the volatility threshold of the strategy
  maxHoldTimeMinutes: number; // The maximum hold time, this is the maximum hold time of the strategy
  minHoldTimeMinutes: number; // The minimum hold time, this is the minimum hold time of the strategy
  adjustHoldTimeWithVolatility: boolean; // Whether the strategy adjusts the hold time with volatility
  minimumRequiredCandles: number; // The minimum required candles, this is the minimum required candles of the strategy
  maxAtrPercent: number | null; // The maximum ATR percentage, this is the maximum ATR percentage of the strategy
  portfolio_ID: number; // The portfolio ID, this is the portfolio ID of the strategy
  active: boolean; // Whether the strategy is active, if false the strategy will not be used at all
  tradeOnKraken: boolean; // Whether the strategy trades on Kraken
  tradeBalance: number; // The trade balance, this is the trade balance of the strategy, if Kraken is true, this will be the balance unless it exceeds the balance on Kraken
  paperTrade: boolean; // Whether or not you want to store the trades on the local DB.
  trailingStopLoss?: number; // The trailing stop loss, will pull out if the price drops below the peak price by the trailing stop loss percentage
}

export const meanReversionConfig: TradingConfig = {
  portfolio_ID: 4,
  strategyType: 'meanReversion',
  rsiThreshold: 25, // More extreme oversold condition for crypto
  macdCrossNeeded: true, // Confirm with MACD cross
  allowVolumeSpikes: true, // Volume confirms reversal
  dynamicStopLoss: false,
  stopLossPct: 2.5, // Wider stop due to crypto volatility
  takeProfitPct: 7.5, // Maintaining 2:1 ratio
  intervalMinutes: 5, // Standard 5-minute chart
  rsiPeriod: 14, // Standard RSI period
  longEmaPeriod: 26,
  shortEmaPeriod: 12,
  signalEmaPeriod: 9,
  volumeSpikeBarCount: 20,
  volumeSpikeFactor: 2.0, // Crypto needs stronger volume confirmation
  volatilityLookback: 20,
  max_position_size: 0.05, // Conservative position size
  max_positions: 5,
  maxVolatility: 3.0, // Higher volatility tolerance
  minAtrPercent: 0.8, // Higher minimum movement required
  volatilityThreshold: 2.0, // Adjusted for crypto's natural volatility
  maxHoldTimeMinutes: 240, // 4 hours
  minHoldTimeMinutes: 5, // Minimum hold to avoid noise
  adjustHoldTimeWithVolatility: true,
  minimumRequiredCandles: 26,
  maxAtrPercent: null,
  active: true,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
};

// Trend Following with Multiple Timeframes
export const trendFollowingConfig: TradingConfig = {
  portfolio_ID: 2,
  strategyType: 'trendFollowing',
  rsiThreshold: 55, // Enter as RSI crosses above 55 (momentum building)
  macdCrossNeeded: true, // MACD cross confirms trend
  allowVolumeSpikes: true, // Volume confirms trend
  dynamicStopLoss: true, // ATR-based stops
  stopLossPct: 1.2, // Base stop loss (modified by ATR)
  takeProfitPct: 5, // 3:1 reward-to-risk ratio
  intervalMinutes: 15, // Longer timeframe for trends
  rsiPeriod: 14,
  longEmaPeriod: 50, // Longer EMAs for trend following
  shortEmaPeriod: 20, // Wider EMA spread
  signalEmaPeriod: 9,
  volumeSpikeBarCount: 30, // Longer volume lookback
  volumeSpikeFactor: 1.3,
  volatilityLookback: 50, // Longer volatility lookback for trends
  max_position_size: 0.2,
  max_positions: 5, // Fewer positions for trend following
  maxVolatility: 1.5, // Lower volatility threshold for trends
  minAtrPercent: 0.3, // Minimum ATR for trend confirmation
  volatilityThreshold: 1.2, // Lower volatility requirement
  maxHoldTimeMinutes: 1440, // 24 hours
  minHoldTimeMinutes: 30, // Avoid quick exits in trends
  adjustHoldTimeWithVolatility: false,
  minimumRequiredCandles: 50,
  maxAtrPercent: null,
  active: true,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
};

export const longTrendFollowingConfig: TradingConfig = {
  portfolio_ID: 3,
  strategyType: 'trendFollowing',
  rsiThreshold: 55, // Enter as RSI crosses above 45 (momentum building)
  macdCrossNeeded: true, // MACD cross confirms trend
  allowVolumeSpikes: true, // Volume confirms trend
  dynamicStopLoss: true, // ATR-based stops
  stopLossPct: 1.2, // Wider stop for crypto trends
  takeProfitPct: 5, // Crypto trends can run longer
  intervalMinutes: 30, // Longer timeframe to filter noise
  rsiPeriod: 14,
  longEmaPeriod: 100, // Longer EMAs to catch major trends
  shortEmaPeriod: 30,
  signalEmaPeriod: 9,
  volumeSpikeBarCount: 30, // Longer volume lookback
  volumeSpikeFactor: 1.3,
  volatilityLookback: 50, // Longer volatility lookback for trends
  max_position_size: 0.2,
  max_positions: 5, // Fewer positions for trend following
  maxVolatility: 2.5, // Higher tolerance for crypto
  minAtrPercent: 0.3, // Minimum ATR for trend confirmation
  volatilityThreshold: 1.2, // Lower volatility requirement
  maxHoldTimeMinutes: 1440 * 3, // 24 hours
  minHoldTimeMinutes: 30, // Avoid quick exits in trends
  adjustHoldTimeWithVolatility: false,
  minimumRequiredCandles: 100,
  maxAtrPercent: null,
  active: true,
  tradeOnKraken: true,
  tradeBalance: 100,
  paperTrade: true,
};

export const longerTrendFollowingConfig: TradingConfig = {
  portfolio_ID: 7,
  strategyType: 'trendFollowing',
  rsiThreshold: 55, // Enter as RSI crosses above 45 (momentum building)
  macdCrossNeeded: true, // MACD cross confirms trend
  allowVolumeSpikes: true, // Volume confirms trend
  dynamicStopLoss: true, // ATR-based stops
  stopLossPct: 1.2, // Wider stop for crypto trends
  takeProfitPct: 5, // Crypto trends can run longer
  intervalMinutes: 60, // Longer timeframe to filter noise
  rsiPeriod: 14,
  longEmaPeriod: 100, // Longer EMAs to catch major trends
  shortEmaPeriod: 30,
  signalEmaPeriod: 9,
  volumeSpikeBarCount: 30, // Longer volume lookback
  volumeSpikeFactor: 1.3,
  volatilityLookback: 50, // Longer volatility lookback for trends
  max_position_size: 0.2,
  max_positions: 5, // Fewer positions for trend following
  maxVolatility: 2.5, // Higher tolerance for crypto
  minAtrPercent: 0.3, // Minimum ATR for trend confirmation
  volatilityThreshold: 1.2, // Lower volatility requirement
  maxHoldTimeMinutes: 1440 * 7, // 24 hours
  minHoldTimeMinutes: 30, // Avoid quick exits in trends
  adjustHoldTimeWithVolatility: false,
  minimumRequiredCandles: 100,
  maxAtrPercent: null,
  active: true,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
};

// Momentum Scalping Strategy
export const scalpingConfig: TradingConfig = {
  portfolio_ID: 1,
  strategyType: 'scalping',
  rsiThreshold: 70, // Enter on strong momentum
  macdCrossNeeded: true, // Quick MACD confirmation
  allowVolumeSpikes: true, // Volume is crucial for scalping
  dynamicStopLoss: false,
  stopLossPct: 0.8, // Wider stops for crypto
  takeProfitPct: 3, // Maintaining 2:1 ratio
  intervalMinutes: 1, // Slightly longer for crypto
  rsiPeriod: 7, // Faster RSI
  longEmaPeriod: 13, // Shorter EMAs for faster signals
  shortEmaPeriod: 8,
  signalEmaPeriod: 5,
  volumeSpikeBarCount: 10, // Quick volume confirmation
  volumeSpikeFactor: 1.8, // Stronger volume confirmation
  volatilityLookback: 20,
  max_position_size: 0.06, // Smaller position due to higher risk
  max_positions: 4, // More positions due to shorter holds
  maxVolatility: 1.5, // Adjusted up for crypto
  minAtrPercent: 0.1, // Very small ATR requirement
  maxAtrPercent: 1.0, // Maximum ATR for scalping
  volatilityThreshold: 0.8, // Lower volatility for quick trades
  maxHoldTimeMinutes: 45, // 30 minutes
  minHoldTimeMinutes: 1, // Quick exits allowed
  adjustHoldTimeWithVolatility: false,
  minimumRequiredCandles: 13,
  active: false,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
};

export const scalpingConfig2: TradingConfig = {
  portfolio_ID: 8,
  strategyType: 'scalping',
  rsiThreshold: 70, // Enter on strong momentum
  macdCrossNeeded: true, // Quick MACD confirmation
  allowVolumeSpikes: true, // Volume is crucial for scalping
  dynamicStopLoss: false,
  stopLossPct: 0.8, // Wider stops for crypto
  takeProfitPct: 3, // Maintaining 2:1 ratio
  intervalMinutes: 5, // Slightly longer for crypto
  rsiPeriod: 7, // Faster RSI
  longEmaPeriod: 13, // Shorter EMAs for faster signals
  shortEmaPeriod: 8,
  signalEmaPeriod: 5,
  volumeSpikeBarCount: 10, // Quick volume confirmation
  volumeSpikeFactor: 1.8, // Stronger volume confirmation
  volatilityLookback: 20,
  max_position_size: 0.06, // Smaller position due to higher risk
  max_positions: 4, // More positions due to shorter holds
  maxVolatility: 1.5, // Adjusted up for crypto
  minAtrPercent: 0.1, // Very small ATR requirement
  maxAtrPercent: 1.0, // Maximum ATR for scalping
  volatilityThreshold: 0.8, // Lower volatility for quick trades
  maxHoldTimeMinutes: 90, // 30 minutes
  minHoldTimeMinutes: 1, // Quick exits allowed
  adjustHoldTimeWithVolatility: false,
  minimumRequiredCandles: 13,
  active: false,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
};

// Volatility Breakout Strategy
export const volatilityBreakoutConfig: TradingConfig = {
  portfolio_ID: 5,
  strategyType: 'volatilityBreakout',
  rsiThreshold: 50, // RSI used only as filter
  macdCrossNeeded: false, // Focus on volatility, not MACD
  allowVolumeSpikes: true, // Volume confirms breakout
  dynamicStopLoss: true, // ATR-based stops crucial
  stopLossPct: 3.5, // Wider stops for crypto breakouts
  takeProfitPct: 10.5, // Crypto breakouts can be explosive
  intervalMinutes: 15, // Changed from 10 to 15 for better breakout signals
  rsiPeriod: 14,
  longEmaPeriod: 26,
  shortEmaPeriod: 12,
  signalEmaPeriod: 9,
  volumeSpikeBarCount: 20,
  volumeSpikeFactor: 2.5, // Very strong volume confirmation needed
  volatilityLookback: 30, // Focus on volatility expansion
  max_position_size: 0.05,
  max_positions: 6,
  maxVolatility: 4.0, // Much higher for crypto breakouts
  minAtrPercent: 1.5, // Higher movement requirement
  volatilityThreshold: 2.5, // Higher threshold for crypto
  maxHoldTimeMinutes: 360, // 6 hours
  minHoldTimeMinutes: 5,
  adjustHoldTimeWithVolatility: true,
  minimumRequiredCandles: 26,
  maxAtrPercent: null,
  active: false,
  tradeOnKraken: false,
  tradeBalance: 10000,
  paperTrade: true,
  trailingStopLoss: 3.5,
};
