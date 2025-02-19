import KrakenClient from 'kraken-api';
import { TradingConfig } from '../config/tradingConfigurations';
import { executeQueryWithRetry } from '../database/sqlconnection';
import { insertTableRecords, updateTableRecords } from '../database/tableActions';
import { analyzeEntry } from '../exitsEntries/enter';
import { analyzeExit } from '../exitsEntries/exits';
import { KrakenWebSocket } from './krakenWebSocket';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

interface Trade {
  price: number;
  volume: number;
  timestamp: number;
}

export interface Indicators {
  rsi: {
    currentRsi: number;
    previousRsi: number;
  };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    shortEma: number;
    longEma: number;
  };
  volumeSpike: boolean;
  sma: number;
  volatilitySpike: boolean;
  atr: number;
}

export interface Position {
  entryPrice: number;
  quantity: number;
  strategy: string;
  entryTime: Date;
  order: Order;
  peakPrice: number;
}

interface Order {
  price: number;
  quantity: number;
  // ... other order properties
}

interface EntrySignal {
  shouldEnter: boolean;
  reason?: string;
  marketData?: any; // Define specific type if needed
}

interface Strategy {
  strategyType: 'scalping' | 'meanReversion' | string;
  // ... other strategy properties
}

export interface Portfolio {
  balance: number;
  positions: Map<string, Position>;
  availableBalance: number;
}

export class TradingEngine {
  private config: TradingConfig;
  public activePositions: Map<string, Position>;
  private indicators: Map<string, Indicators>;
  private websockets: Map<string[], KrakenWebSocket>;
  private lastCandle: Map<string, Candle>;
  private candleBuffer: Map<string, Candle[]>;
  private portfolio: Portfolio;
  public placeNewOrder: boolean;

  constructor(config: TradingConfig, activePositions: Map<string, Position>) {
    this.config = config;
    this.activePositions = activePositions;
    this.indicators = new Map();
    this.websockets = new Map();
    this.lastCandle = new Map();
    this.candleBuffer = new Map(); // Store recent candles for indicators
    this.placeNewOrder = true;
    this.portfolio = {
      balance: 0,
      positions: this.activePositions, // Initialize with activePositions
      availableBalance: 0,
    };
  }

  async initialize(symbols: string[], portfolioBalance: Portfolio): Promise<void> {
    this.portfolio = portfolioBalance;

    // Calculate required candles based on longest EMA period
    const requiredCandles = this.config.longEmaPeriod * 4; // Get 4x the longest period

    // Fetch historical data for each symbol first
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${this.config.intervalMinutes}`
        );
        const data: any = await response.json();

        if ('error' in data && Array.isArray(data.error) && data.error.length > 0) {
          console.error(`[${symbol}] Error fetching historical data:`, data.error);
          continue;
        }
        // Initialize buffer and convert historical data
        const historicalCandles: Candle[] = (data as any).result[
          Object.keys((data as any).result)[0]
        ]
          .map((ohlc: any[]) => ({
            timestamp: ohlc[0],
            open: parseFloat(ohlc[1]),
            high: parseFloat(ohlc[2]),
            low: parseFloat(ohlc[3]),
            close: parseFloat(ohlc[4]),
            volume: parseFloat(ohlc[6]),
          }))
          .slice(-requiredCandles - 1); // Get one extra candle for the buffer

        // Store the last (in-progress) candle separately and remove it from the buffer
        const lastCandle = historicalCandles.pop();
        this.lastCandle.set(symbol, lastCandle!);
        this.candleBuffer.set(symbol, historicalCandles);

        // Initialize indicators with historical data
        this.indicators.set(symbol, {
          rsi: {
            currentRsi: 0,
            previousRsi: 0,
          },
          macd: {
            macd: 0,
            signal: 0,
            histogram: 0,
            shortEma: 0,
            longEma: 0,
          },
          volumeSpike: false,
          sma: 0,
          volatilitySpike: false,
          atr: 0,
        });

        // Update indicators with historical data
        this.updateIndicators(symbol, historicalCandles);

        // console.log(`[${symbol}] Initialized with ${historicalCandles.length} historical candles`);
        // console.log(historicalCandles[0])
      } catch (error) {
        console.error(`[${symbol}] Failed to fetch historical data:`, error);
      }
    }

    // Setup websocket connections for each symbol
    await this.setupWebSocket(symbols);
  }

  private async setupWebSocket(symbols: string[]): Promise<void> {
    const ws = new KrakenWebSocket(symbols, this.config.intervalMinutes, (data) => {
      this.handleWebSocketMessage(symbols, data);
    });
    this.websockets.set(symbols, ws);
  }

  private handleWebSocketMessage(symbols: string[], data: any): void {
    if (data.channel === 'ohlc') {
      const candleEvents = data.data;

      // console.log(`[${symbols}] Candle events:`, candleEvents);

      for (const candleData of candleEvents) {
        const { symbol, open, high, low, close, volume, interval_begin } = candleData;

        // Convert ISO timestamp to Unix timestamp (seconds)
        const unixTimestamp = Math.floor(new Date(interval_begin).getTime() / 1000);

        const candle: Candle = {
          timestamp: unixTimestamp,
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume),
        };

        const lastCandle = this.lastCandle.get(symbol);

        // console.log(`[${symbol}] Last candle:`, lastCandle);

        if (lastCandle) {
          if (unixTimestamp > lastCandle.timestamp) {
            // New candle period has started
            const buffer = this.candleBuffer.get(symbol) || [];
            buffer.push(lastCandle);

            const requiredCandles = Math.max(
              this.config.longEmaPeriod * 4, // For MACD calculation
              this.config.minimumRequiredCandles
            );

            while (buffer.length > requiredCandles) {
              buffer.shift();
            }

            this.candleBuffer.set(symbol, buffer);
            this.lastCandle.set(symbol, candle);

            // Only update indicators on new candle period
            // console.log(`[${symbol}] Updating indicators with ${buffer.length} candles`);
            this.updateIndicators(symbol, buffer);
          } else if (unixTimestamp === lastCandle.timestamp) {
            // Only update if there's a meaningful change in the candle
            if (
              candle.high !== lastCandle.high ||
              candle.low !== lastCandle.low ||
              candle.close !== lastCandle.close ||
              candle.volume !== lastCandle.volume
            ) {
              this.lastCandle.set(symbol, candle);
              // Don't update indicators here as the candle isn't complete
            }
          }
        }
      }
    } else if (data.channel === 'trade') {
      const tradeEvents = data.data;

      for (const tradeData of tradeEvents) {
        const { symbol, side, qty, price, ord_type, trade_id, timestamp } = tradeData;

        // Convert ISO timestamp to Unix timestamp
        const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

        const trade: Trade = {
          price: parseFloat(price),
          volume: parseFloat(qty),
          timestamp: unixTimestamp,
        };

        this.updateTrades(symbol, trade.price);
      }
    }
  }

  private updateIndicators(symbol: string, candles: Candle[]): void {
    if (candles.length < this.config.minimumRequiredCandles) {
      // console.log(`[${symbol}] Not enough candles for indicators: ${candles.length}/${this.config.minimumRequiredCandles}`);
      return;
    }

    const currentIndicators = {
      rsi: {
        currentRsi: this.calculateRSI(candles.slice(-this.config.rsiPeriod - 1)),
        previousRsi: this.calculateRSI(candles.slice(-this.config.rsiPeriod - 2, -1)),
      },
      macd: this.calculateMACD(candles),
      volumeSpike: this.detectVolumeSpike(
        candles,
        this.config.volumeSpikeBarCount,
        this.config.volumeSpikeFactor
      ),
      sma: this.calculateSMA(candles, this.config.longEmaPeriod),
      volatilitySpike: this.detectVolatilitySpike(
        candles,
        this.config.volatilityLookback,
        this.config.volatilityThreshold
      ),
      atr: this.calculateATR(candles, this.config.volatilityLookback),
    };

    this.indicators.set(symbol, currentIndicators as unknown as Indicators);
    this.updateTrades(symbol);
    this.createPosition(symbol);
  }
  // Add placeholder methods for indicator calculations
  private calculateRSI(candles: Candle[]): number {
    if (candles.length < this.config.rsiPeriod + 1) return 0;

    const period = this.config.rsiPeriod;
    let gains = 0;
    let losses = 0;

    // First pass to get initial averages
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }

    // Get initial averages
    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate smoothed RSI for remaining periods
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;

      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(candles: Candle[]) {
    const shortEmaPeriod = this.config.shortEmaPeriod; // 12
    const longEmaPeriod = this.config.longEmaPeriod; // 26
    const signalEmaPeriod = this.config.signalEmaPeriod; // 9

    // Get closing prices
    const prices = candles.map((candle) => candle.close);

    // Debug log
    // console.log(`Calculating MACD with ${prices.length} prices`);

    // Ensure we have enough data
    if (prices.length < longEmaPeriod + signalEmaPeriod) {
      console.log('Not enough data for MACD calculation');
      return {
        macd: 0,
        signal: 0,
        histogram: 0,
      };
    }

    // Calculate EMAs
    const shortEma = this.calculateEMA(prices, shortEmaPeriod);
    const longEma = this.calculateEMA(prices, longEmaPeriod);

    // Ensure arrays are the same length by trimming the longer one
    const shortEmaValues = shortEma.slice(-longEma.length);

    // Calculate MACD line
    const macdHistory = shortEmaValues.map((value, index) => value - longEma[index]);

    // Calculate Signal line (9-day EMA of MACD line)
    const signalLine = this.calculateEMA(macdHistory, signalEmaPeriod);

    // Get current values (most recent)
    const currentMACD = macdHistory[macdHistory.length - 1];
    const currentSignal = signalLine[signalLine.length - 1];
    const currentHistogram = currentMACD - currentSignal;

    // Debug log
    // console.log('MACD values:', {
    //     macd: currentMACD,
    //     signal: currentSignal,
    //     histogram: currentHistogram
    // });

    return {
      macd: currentMACD,
      signal: currentSignal,
      histogram: currentHistogram,
      shortEma: shortEma[shortEma.length - 1],
      longEma: longEma[longEma.length - 1],
    };
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // Initialize EMA with SMA for first period
    const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    ema.push(sma);

    // Calculate EMA for remaining prices
    for (let i = period; i < prices.length; i++) {
      const currentPrice = prices[i];
      const previousEMA = ema[ema.length - 1];
      const currentEMA = (currentPrice - previousEMA) * multiplier + previousEMA;
      ema.push(currentEMA);
    }

    return ema;
  }

  private detectVolumeSpike(candles: Candle[], lookback: number, factor: number): boolean {
    let volumeSpike = false;
    const recentCandles = candles.slice(-lookback);
    const averageVolume = recentCandles.reduce((sum, candle) => sum + candle.volume, 0) / lookback;

    for (let i = 0; i < recentCandles.length; i++) {
      const currentVolume = recentCandles[i].volume;
      if (currentVolume > averageVolume * factor) {
        volumeSpike = true;
        break;
      }
    }

    return volumeSpike;
  }

  private calculateSMA(candles: Candle[], period: number): number {
    const sum = candles.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }

  private detectVolatilitySpike(candles: Candle[], lookback: number, threshold: number): boolean {
    const recentCandles = candles.slice(-lookback);
    const averageRange =
      recentCandles.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / lookback;
    const currentRange = candles[candles.length - 1].high - candles[candles.length - 1].low;

    return currentRange > averageRange * threshold;
  }

  private calculateATR(candles: Candle[], period: number): number {
    const tr = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const previousClose = candles[i - 1].close;
      const trueRange = Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose)
      );
      tr.push(trueRange);
    }

    const atr = tr.reduce((sum, tr) => sum + tr, 0) / tr.length;
    return atr;
  }

  private async updateTrades(symbol: string, currentPrice?: number): Promise<void> {
    const position = this.activePositions.get(symbol);
    if (!position) {
      return;
    }

    try {
      const currentIndicators = this.indicators.get(symbol);
      if (!currentIndicators) {
        console.log(`[${symbol}] No indicators available for exit analysis`);
        return;
      }

      let recentClosePrice = currentPrice;
      if (!recentClosePrice) {
        recentClosePrice = this.lastCandle.get(symbol)?.close;
      }

      // Update peak price logic
      if (recentClosePrice) {
        const dbPeakPrice =
          position.peakPrice > recentClosePrice ? position.peakPrice : recentClosePrice;
        position.peakPrice = Math.max(
          recentClosePrice,
          dbPeakPrice || position.peakPrice || recentClosePrice
        );
      }

      const { shouldExit, reason } = analyzeExit(
        position,
        currentIndicators,
        this.config,
        recentClosePrice,
        position.peakPrice
      );
      if (shouldExit && recentClosePrice) {
        if (this.config.tradeOnKraken) {
          await this.postKrakenTrade(symbol, position.quantity, 'sell');
        }
        // Basic PnL before fees
        const grossPnl = (recentClosePrice - position.entryPrice) * position.quantity;

        // Calculate fees (using 0.26% as worst case scenario, adjust based on your fee tier)
        const feeRate = 0.004; // 0.26%
        const entryFee = position.entryPrice * position.quantity * feeRate;
        const exitFee = recentClosePrice * position.quantity * feeRate;
        const totalFees = entryFee + exitFee;

        this.portfolio.balance += recentClosePrice * position.quantity - exitFee;
        this.portfolio.availableBalance = this.portfolio.balance;
        this.portfolio.positions.delete(symbol);
        this.activePositions.delete(symbol);

        if (this.config.paperTrade) {
          // Net PnL after fees
          const netPnl = grossPnl - totalFees;
          const netPnlPercentage = (netPnl / (position.entryPrice * position.quantity)) * 100;

          try {
            const result = await executeQueryWithRetry(
              `SELECT ID FROM Trades WHERE symbol = '${symbol}' AND closed_at IS NULL AND test_case = ${process.env.TEST_CASE} AND portfolio_ID = ${this.config.portfolio_ID}`
            );
            const trade_id = result.recordset[0].ID;

            const closedTrade = [];
            closedTrade.push({
              symbol: symbol,
              status: 'closed',
              exit_price: recentClosePrice,
              Closed_At: new Date().toISOString(),
              pnl: netPnl,
              reason: reason,
              pnl_percentage: netPnlPercentage,
              ID: trade_id,
              peak_price: position.peakPrice,
            });

            // Update database
            try {
              await updateTableRecords('trades', closedTrade);

              console.log(`[${symbol}] Position closed:`, {
                entryPrice: position.entryPrice,
                exitPrice: recentClosePrice,
                grossPnl: grossPnl,
                fees: totalFees,
                netPnl: netPnl,
                netPnlPercentage: `${netPnlPercentage.toFixed(2)}%`,
                strategy: position.strategy,
                reason: reason,
              });
            } catch (error) {
              console.error(
                'Error updating trade: SELECT ID FROM Trades WHERE symbol = ' +
                  symbol +
                  ' AND closed_at IS NULL AND test_case = ' +
                  process.env.TEST_CASE +
                  ' AND portfolio_ID = ' +
                  this.config.portfolio_ID,
                this.activePositions,
                error
              );
            }
          } catch (error) {
            console.error('Error updating trade:', error);
          }
        }
      } else {
        if (this.config.paperTrade) {
          if (!recentClosePrice) {
            return;
          }
          const grossPnl = (recentClosePrice - position.entryPrice) * position.quantity;

          // Calculate fees (using 0.26% as worst case scenario, adjust based on your fee tier)
          const feeRate = 0.004; // 0.26%
          const entryFee = position.entryPrice * position.quantity * feeRate;
          const exitFee = recentClosePrice * position.quantity * feeRate;
          const totalFees = entryFee + exitFee;

          // Net PnL after fees
          const netPnl = grossPnl - totalFees;
          const netPnlPercentage = (netPnl / (position.entryPrice * position.quantity)) * 100;

          try {
            const result = await executeQueryWithRetry(
              `SELECT ID, peak_price FROM Trades WHERE symbol = '${symbol}' AND closed_at IS NULL AND test_case = ${process.env.TEST_CASE} AND portfolio_ID = ${this.config.portfolio_ID}`
            );
            const trade_id = result.recordset[0].ID;
            let peak_price: number | undefined = result.recordset[0].peak_price;
            if (!peak_price || recentClosePrice > peak_price) {
              peak_price = recentClosePrice;
            }
            const updateTrade = [];

            updateTrade.push({
              ID: trade_id,
              pnl: netPnl,
              pnl_percentage: netPnlPercentage,
              peak_price: peak_price,
            });
            try {
              await updateTableRecords('trades', updateTrade);
            } catch (error) {
              console.error(
                'Error updating trade: SELECT ID, peak_price FROM Trades WHERE symbol = ' +
                  symbol +
                  ' AND closed_at IS NULL AND test_case = ' +
                  process.env.TEST_CASE +
                  ' AND portfolio_ID = ' +
                  this.config.portfolio_ID,
                error
              );
            }
          } catch (error) {
            console.error('Error updating trade:', error);
          }
        }
      }
    } catch (error) {
      console.error(`[${symbol}] Error checking trade status:`, error);
      return;
    }
  }
  private async createPosition(symbol: string): Promise<Position | undefined> {
    // Check if we already have an active position for this symbol
    if (this.activePositions.has(symbol) && this.placeNewOrder) {
      return;
    }

    const indicator = this.indicators.get(symbol);
    if (!indicator) {
      throw new Error(`[${symbol}] No indicators available for position creation`);
    }

    const maxPositions = this.config.max_positions;
    const currentPositions = this.activePositions.size; // Use activePositions.size instead
    if (currentPositions >= maxPositions) {
      // console.log(`Max positions (${maxPositions}) reached for ${this.config.strategyType}. Current positions: ${currentPositions}`);
      return;
    }

    const recentClosePrice = this.lastCandle.get(symbol)?.close;
    if (!recentClosePrice) {
      return;
    }

    const result = analyzeEntry(indicator, this.config, recentClosePrice);
    if (result.shouldEnter) {
      const positionSize = this.calculatePositionSize(indicator, this.config, recentClosePrice);

      if (this.config.tradeOnKraken) {
        try {
          console.log(`[${symbol}] Posting Kraken trade:`, {
            symbol: symbol,
            quantity: positionSize,
            type: 'buy',
            entryPrice: recentClosePrice,
          });
          await this.postKrakenTrade(symbol, positionSize, 'buy');
        } catch (error) {
          console.error('Error posting Kraken trade:', error);
          // Early return if Kraken trade fails - don't create paper trade
          return;
        }
      }

      if (this.config.paperTrade) {
        // Create new position object
        console.log(`[${symbol}] Creating position:`, {
          entryPrice: recentClosePrice,
          quantity: positionSize,
          strategy: this.config.strategyType,
          entryTime: new Date(),
        });
        const newPosition: Position = {
          entryPrice: recentClosePrice,
          quantity: positionSize,
          strategy: this.config.strategyType, // You might want to make this dynamic based on the entry signal
          entryTime: new Date(),
          peakPrice: recentClosePrice,
          order: {
            price: recentClosePrice,
            quantity: positionSize,
          },
        };

        // Update local portfolio state
        this.portfolio.positions.set(symbol, newPosition);
        // this.portfolio.balance -= (recentClosePrice * positionSize);
        this.portfolio.availableBalance = this.portfolio.balance;
        this.activePositions.set(symbol, newPosition);

        // TODO: post Kraken Trade first
        const newTrade = [];
        newTrade.push({
          portfolio_ID: this.config.portfolio_ID,
          symbol: symbol,
          coin_id: symbol,
          type: 'long',
          status: 'open',
          entry_price: recentClosePrice,
          amount: positionSize,
          Opened_At: new Date().toISOString(),
          notes: this.config.strategyType + ' ' + result.reason,
          test_case: process.env.TEST_CASE,
          peak_price: recentClosePrice,
        });

        try {
          await insertTableRecords('trades', newTrade);
          return newPosition;
        } catch (error) {
          console.error('Error inserting trade:', error);
          // Rollback local portfolio changes if DB insert fails
          this.portfolio.positions.delete(symbol);
          // this.portfolio.balance += (recentClosePrice * positionSize);
          this.portfolio.availableBalance = this.portfolio.balance;
        }
      }
    }
    return;
  }

  private async postKrakenTrade(
    symbol: string,
    quantity: number,
    type: 'buy' | 'sell'
  ): Promise<void> {
    const kraken = new KrakenClient(
      process.env.KRAKEN_API_KEY || '',
      process.env.KRAKEN_API_SECRET || ''
    );

    const result = await kraken.api('AddOrder', {
      pair: symbol,
      type: type,
      ordertype: 'market',
      volume: quantity,
    });
    console.log(`[${symbol}] Kraken trade posted:`, result);
  }

  private calculatePositionSize = (
    indicator: Indicators,
    config: TradingConfig,
    current_price: number
  ) => {
    const { max_position_size } = config;

    // 1. Calculate maximum position based on account size
    const maxPositionByAccount = this.portfolio.balance * max_position_size; // 9892 * 0.03 = ~296

    // 2. Calculate position size based on risk
    const riskAmount = this.portfolio.balance * 0.04; //config.maxRiskPerTrade || 0.01; // 9892 * 0.01 = ~99
    const positionSizeByRisk = riskAmount / (current_price * (config.stopLossPct / 100));

    // 3. ATR-based volatility adjustment
    const atrPercent = (indicator.atr / current_price) * 100;
    const volatilityAdjustment = Math.min(1, config.maxVolatility / atrPercent);

    // 4. Calculate final position size in units
    const positionSize =
      Math.min(
        maxPositionByAccount / current_price, // Convert to units
        positionSizeByRisk
      ) * volatilityAdjustment;

    // 5. Add safety checks
    const finalPositionSize = Math.min(positionSize, maxPositionByAccount / current_price);

    return finalPositionSize;
  };

  public async closeAllPositions(): Promise<void> {
    console.log(`Closing all positions for ${this.config.strategyType} strategy...`);

    for (const [symbol, position] of this.activePositions) {
      try {
        if (this.config.tradeOnKraken) {
          await this.postKrakenTrade(symbol, position.quantity, 'sell');
        }

        // Close position in local tracking
        this.portfolio.positions.delete(symbol);
        this.activePositions.delete(symbol);

        console.log(`✅ Closed position for ${symbol}`);
      } catch (error) {
        console.error(`❌ Error closing position for ${symbol}:`, error);
      }
    }
  }
}
