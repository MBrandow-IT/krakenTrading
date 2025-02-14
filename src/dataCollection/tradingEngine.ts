import { TradingConfig } from '../config/tradingConfigurations';
import { executeQuery } from '../database/sqlconnection';
import { insertTableRecords, updateTableRecords } from '../database/tableActions';
import { analyzeEntry } from '../exitsEntries/enter';
import { analyzeExit } from '../exitsEntries/exits';
import { portfolio } from '../portfolio/portfolio';
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
    rsi: number;
    macd: {
        macd: number;
        signal: number;
        histogram: number;
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
    private activePositions: Map<string, Position>;
    private indicators: Map<string, Indicators>;
    private websockets: Map<string[], KrakenWebSocket>;
    private lastCandle: Map<string, Candle>;
    private candleBuffer: Map<string, Candle[]>;
    private accountBalance?: number;
    private portfolio: Portfolio;

    constructor(config: TradingConfig) {
        this.config = config;
        this.activePositions = new Map();
        this.indicators = new Map();
        this.websockets = new Map();
        this.lastCandle = new Map();
        this.candleBuffer = new Map();  // Store recent candles for indicators
        this.portfolio = portfolio();
    }

    async initialize(symbols: string[]): Promise<void> {
        // Fetch historical data for each symbol first
        for (const symbol of symbols) {
            try {
                const response = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${this.config.intervalMinutes}`);
                const data: any = await response.json();
                
                if ('error' in data && Array.isArray(data.error) && data.error.length > 0) {
                    console.error(`[${symbol}] Error fetching historical data:`, data.error);
                    continue;
                }
                // Initialize buffer and convert historical data
                const historicalCandles: Candle[] = (data as any).result[Object.keys((data as any).result)[0]]
                    .map((ohlc: any[]) => ({
                        timestamp: ohlc[0],
                        open: parseFloat(ohlc[1]),
                        high: parseFloat(ohlc[2]),
                        low: parseFloat(ohlc[3]),
                        close: parseFloat(ohlc[4]),
                        volume: parseFloat(ohlc[6])
                    }))
                    .slice(-this.config.minimumRequiredCandles); // Only keep required number of candles

                this.candleBuffer.set(symbol, historicalCandles);
                
                // Initialize indicators with historical data
                this.indicators.set(symbol, {
                    rsi: 0,
                    macd: {
                        macd: 0,
                        signal: 0,
                        histogram: 0
                    },
                    volumeSpike: false,
                    sma: 0,
                    volatilitySpike: false,
                    atr: 0
                });

                // Update indicators with historical data
                this.updateIndicators(symbol, historicalCandles);
                
                console.log(`[${symbol}] Initialized with ${historicalCandles.length} historical candles`);
                // console.log(historicalCandles[0])
            } catch (error) {
                console.error(`[${symbol}] Failed to fetch historical data:`, error);
            }
        }

        // Setup websocket connections for each symbol
        await this.setupWebSocket(symbols);
    }

    private async setupWebSocket(symbols: string[]): Promise<void> {
        const ws = new KrakenWebSocket(
            symbols,
            this.config.intervalMinutes,
            (data) => {
                this.handleWebSocketMessage(symbols, data);
            }
        );
        this.websockets.set(symbols, ws);
    }

    private handleWebSocketMessage(symbols: string[], data: any): void {
        if (data.channel === 'ohlc') {
            // console.log(`[WebSocket] Received ${data.type} data with ${data.data.length} candles`);
            
            // Handle both snapshot and updates
            const candleEvents = data.data;
            
            for (const candleData of candleEvents) {
                const {
                    symbol,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    interval_begin
                } = candleData;


                const candle: Candle = {
                    timestamp: interval_begin,
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close),
                    volume: parseFloat(volume)
                };

                // Add to buffer if it matches our interval
                // console.log(`[${symbol}] Alignment check:`, {
                //     intervalMinutes: this.config.intervalMinutes,
                //     intervalSeconds,
                //     isAlignedWithInterval,
                //     remainder: timestamp % intervalSeconds
                // });

                if (candle.timestamp !== this.lastCandle.get(symbol)?.timestamp) {
                    // console.log(`[${symbol}] Processing ${data.type} candle:`, {
                    //     time: candle.timestamp,
                    //     close: candle.close,
                    //     volume: candle.volume
                    // });
                    
                    if (data.type === 'snapshot') {
                        const buffer = this.candleBuffer.get(symbol) || [];
                        buffer.push(candle);
                        this.candleBuffer.set(symbol, buffer);
                        this.lastCandle.set(symbol, candle);
                        // console.log(`[${symbol}] Added to buffer. New size: ${buffer.length}`);
                    } else {
                        this.updateCandle(symbol, candle);
                    }
                } else {
                    // console.log(`[${symbol}] Skipping candle - not aligned with interval`);
                }
            }
        } else if (data.channel === 'trade') {
            const tradeEvents = data.data;
            
            for (const tradeData of tradeEvents) {
                const {
                    symbol,
                    side,
                    qty,
                    price,
                    ord_type,
                    trade_id,
                    timestamp
                } = tradeData;

                // Convert ISO timestamp to Unix timestamp
                const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

                const trade: Trade = {
                    price: parseFloat(price),
                    volume: parseFloat(qty),
                    timestamp: unixTimestamp
                };

                // console.log(`[${symbol}] Received trade:`, {
                //     price: trade.price,
                //     volume: trade.volume,
                //     time: new Date(trade.timestamp * 1000).toISOString(),
                //     side,
                //     orderType: ord_type,
                //     tradeId: trade_id
                // });

                this.updateTrades(symbol, trade.price);
            }
        }
    }

    private updateCandle(symbol: string, candle: Candle): void {
        this.lastCandle.set(symbol, candle);
        const buffer = this.candleBuffer.get(symbol) || [];
        buffer.push(candle);
        
        // Log buffer status
        // console.log(`[${symbol}] Candle buffer size: ${buffer.length}/${this.config.minimumRequiredCandles}`);
        
        while (buffer.length > this.config.minimumRequiredCandles) {
            buffer.shift();
        }
        this.candleBuffer.set(symbol, buffer);

        this.updateIndicators(symbol, buffer);
    }

    private updateIndicators(symbol: string, candles: Candle[]): void {
        if (candles.length < this.config.minimumRequiredCandles) {
            // console.log(`[${symbol}] Not enough candles for indicators: ${candles.length}/${this.config.minimumRequiredCandles}`);
            return;
        }

        const currentIndicators = {
            rsi: this.calculateRSI(candles),
            macd: this.calculateMACD(
                candles
            ),
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

        console.log(`[${symbol}] Updated indicators:`)
        //     rsi: currentIndicators.rsi,
        //     macd: {
        //         macd: currentIndicators.macd.macd[currentIndicators.macd.macd.length - 1],
        //         signal: currentIndicators.macd.signal[currentIndicators.macd.signal.length - 1],
        //         histogram: currentIndicators.macd.histogram[currentIndicators.macd.histogram.length - 1]
        //     },
        //     volumeSpike: currentIndicators.volumeSpike,
        //     sma: currentIndicators.sma,
        //     volatilitySpike: currentIndicators.volatilitySpike,
        //     atr: currentIndicators.atr
        // });

        this.indicators.set(symbol, currentIndicators as unknown as Indicators);
        this.updateTrades(symbol)
        this.createPosition(symbol);
    }
    // Add placeholder methods for indicator calculations
    private calculateRSI(candles: Candle[]): number {
        const gains = [];
        const losses = [];

        for (let i = 1; i < candles.length; i++) {
            const priceChange = candles[i].close - candles[i - 1].close;
            if (priceChange > 0) {
                gains.push(priceChange);
            } else {
                losses.push(Math.abs(priceChange));
            }
        }

        const averageGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
        const averageLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;

        const relativeStrength = averageGain / averageLoss;
        const rsi = 100 - 100 / (1 + relativeStrength);

        return rsi;
    }

    private calculateMACD(candles: Candle[]) {
        const shortEmaPeriod = this.config.shortEmaPeriod;
        const longEmaPeriod = this.config.longEmaPeriod;
        const signalEmaPeriod = this.config.signalEmaPeriod;

        const shortEma = this.calculateEMA(candles, shortEmaPeriod);
        const longEma = this.calculateEMA(candles, longEmaPeriod);
        const macdLine = shortEma.map((value, index) => value - longEma[index]);
        const signalLine = this.calculateEMA(macdLine, signalEmaPeriod);
        const histogram = macdLine.map((value, index) => value - signalLine[index]);
        
        return { macd: macdLine, signal: signalLine, histogram: histogram };
    }
    private calculateEMA(candles: Candle[] | number[], period: number): number[] {
        const ema: number[] = [];
        const multiplier = 2 / (period + 1);

        for (let i = 0; i < candles.length; i++) {
            const closePrice = Array.isArray(candles) && typeof candles[i] === 'object' 
                ? (candles[i] as Candle).close 
                : (candles[i] as number);
            const emaValue = ema.length === 0 ? closePrice : (closePrice - ema[i - 1]) * multiplier + ema[i - 1];
            ema.push(emaValue);
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
        const averageRange = recentCandles.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / lookback;
        const currentRange = candles[candles.length - 1].high - candles[candles.length - 1].low;

        return currentRange > averageRange * threshold;
    }

    private calculateATR(candles: Candle[], period: number): number {
        const tr = [];

        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const previousClose = candles[i - 1].close;
            const trueRange = Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
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

        const currentIndicators = this.indicators.get(symbol);
        if (!currentIndicators) {
            console.log(`[${symbol}] No indicators available for exit analysis`);
            return;
        }
        let recentClosePrice = currentPrice;
        if (!recentClosePrice) {
            recentClosePrice = this.lastCandle.get(symbol)?.close;
        }

        const {shouldExit, reason} = analyzeExit(position, currentIndicators, this.config, recentClosePrice);
        if (shouldExit && recentClosePrice) {
            // Basic PnL before fees
            const grossPnl = (recentClosePrice - position.entryPrice) * position.quantity;
            
            // Calculate fees (using 0.26% as worst case scenario, adjust based on your fee tier)
            const feeRate = 0.0026; // 0.26%
            const entryFee = position.entryPrice * position.quantity * feeRate;
            const exitFee = recentClosePrice * position.quantity * feeRate;
            const totalFees = entryFee + exitFee;
            
            // Net PnL after fees
            const netPnl = grossPnl - totalFees;
            const netPnlPercentage = ((netPnl) / (position.entryPrice * position.quantity)) * 100;
            
            // Update portfolio
            this.portfolio.balance += (recentClosePrice * position.quantity) - exitFee;
            this.portfolio.availableBalance = this.portfolio.balance;
            this.portfolio.positions.delete(symbol);
            this.activePositions.delete(symbol);

            const result = await executeQuery(`SELECT ID FROM Trades WHERE symbol = '${symbol}' AND closed_at IS NULL`)
            const trade_id = result.recordset[0].ID

            const closedTrade = []
            closedTrade.push({
                symbol: symbol,
                status: 'closed',
                exit_price: recentClosePrice,
                Closed_At: new Date().toISOString(),
                pnl: netPnl,
                reason: reason,
                pnl_percentage: netPnlPercentage,
                ID: trade_id
            })

            // Update database
            try {
                await updateTableRecords('trades', closedTrade)
                
                console.log(`[${symbol}] Position closed:`, {
                    entryPrice: position.entryPrice,
                    exitPrice: recentClosePrice,
                    grossPnl: grossPnl,
                    fees: totalFees,
                    netPnl: netPnl,
                    netPnlPercentage: `${netPnlPercentage.toFixed(2)}%`,
                    strategy: position.strategy,
                    reason: reason
                });
            } catch (error) {
                console.error('Error updating trade:', error);
                // Rollback portfolio changes if DB update fails
                this.portfolio.balance -= (recentClosePrice * position.quantity);
                this.portfolio.availableBalance = this.portfolio.balance;
                this.portfolio.positions.set(symbol, position);
                this.activePositions.set(symbol, position);
            }
        } else {
            const recentClosePrice = this.lastCandle.get(symbol)?.close;
            if (!recentClosePrice) {
                return;
            }
            const grossPnl = (recentClosePrice - position.entryPrice) * position.quantity;
            
            // Calculate fees (using 0.26% as worst case scenario, adjust based on your fee tier)
            const feeRate = 0.0026; // 0.26%
            const entryFee = position.entryPrice * position.quantity * feeRate;
            const exitFee = recentClosePrice * position.quantity * feeRate;
            const totalFees = entryFee + exitFee;
            
            // Net PnL after fees
            const netPnl = grossPnl - totalFees;
            const netPnlPercentage = ((netPnl) / (position.entryPrice * position.quantity)) * 100;

            const result = await executeQuery(`SELECT ID, peak_price FROM Trades WHERE symbol = '${symbol}' AND closed_at IS NULL`)
            const trade_id = result.recordset[0].ID
            let peak_price = result.recordset[0].peak_price
            if (recentClosePrice > peak_price) {
                peak_price = recentClosePrice
            }
            const updateTrade = []

            updateTrade.push({
                ID: trade_id,
                pnl: netPnl,
                pnl_percentage: netPnlPercentage,
                peak_price: peak_price
            })

            try {
                await updateTableRecords('trades', updateTrade)
            } catch (error) {
                console.error('Error updating trade:', error);
            }
        }
    }
    private async createPosition(symbol: string): Promise<Position | undefined> {
        // Check if we already have an active position for this symbol
        if (this.activePositions.has(symbol)) {
            return;
        }

        const indicator = this.indicators.get(symbol);
        if (!indicator) {
            throw new Error(`[${symbol}] No indicators available for position creation`);
        }

        const maxPositions = this.config.max_positions;
        const currentPositions = this.portfolio.positions.size;
        if (currentPositions >= maxPositions) {
            // throw new Error(`[${symbol}] Max positions reached: ${currentPositions}/${maxPositions}`);
            return;
        }

        const recentClosePrice = this.lastCandle.get(symbol)?.close;
        if (!recentClosePrice) {
            return
        }
        const shouldEnter = analyzeEntry(indicator, this.config, recentClosePrice);
        if (shouldEnter) {
            const positionSize = this.calculatePositionSize(indicator, this.config, this.portfolio.balance, recentClosePrice)
            
            // Create new position object
            console.log(`[${symbol}] Creating position:`, {
                entryPrice: recentClosePrice,
                quantity: positionSize,
                strategy: this.config.strategyType,
                entryTime: new Date()
            });
            const newPosition: Position = {
                entryPrice: recentClosePrice,
                quantity: positionSize,
                strategy: this.config.strategyType, // You might want to make this dynamic based on the entry signal
                entryTime: new Date(),
                order: {
                    price: recentClosePrice,
                    quantity: positionSize
                }
            };

            // Update local portfolio state
            this.portfolio.positions.set(symbol, newPosition);
            this.portfolio.balance -= (recentClosePrice * positionSize);
            this.portfolio.availableBalance = this.portfolio.balance;
            this.activePositions.set(symbol, newPosition);

            // TODO: post Kraken Trade first
            const newTrade = []
            newTrade.push({
                portfolio_ID: this.config.portfolio_ID,
                symbol: symbol,
                coin_id: symbol,
                type: 'long',
                status: 'open',
                entry_price: recentClosePrice,
                amount: positionSize,
                Opened_At: new Date().toISOString(),
            })

            try {
                await insertTableRecords('trades', newTrade)
                return newPosition;
            } catch (error) {
                console.error('Error inserting trade:', error);
                // Rollback local portfolio changes if DB insert fails
                this.portfolio.positions.delete(symbol);
                this.portfolio.balance += (recentClosePrice * positionSize);
                this.portfolio.availableBalance = this.portfolio.balance;
            }
        }

        return;
    }

    private calculatePositionSize = (indicator: Indicators, config: TradingConfig, accountBalance: number, current_price: number) => {
        const { max_position_size } = config;
        
        // 1. Calculate maximum position based on account size
        const maxPositionByAccount = accountBalance * max_position_size; // 9892 * 0.03 = ~296
        
        // 2. Calculate position size based on risk
        const riskAmount = accountBalance * 0.01//config.maxRiskPerTrade || 0.01; // 9892 * 0.01 = ~99
        const positionSizeByRisk = riskAmount / (current_price * (config.stopLossPct/100));
        
        // 3. ATR-based volatility adjustment
        const atrPercent = (indicator.atr / current_price) * 100;
        const volatilityAdjustment = Math.min(1, config.maxVolatility / atrPercent);
        
        // 4. Calculate final position size in units
        const positionSize = Math.min(
            maxPositionByAccount / current_price,  // Convert to units
            positionSizeByRisk
        ) * volatilityAdjustment;
        
        // 5. Add safety checks
        const finalPositionSize = Math.min(
            positionSize,
            maxPositionByAccount / current_price
        );
    
        // 6. Log calculations for debugging
        // console.log({
        //     maxPositionByAccount: maxPositionByAccount / current_price,
        //     positionSizeByRisk,
        //     volatilityAdjustment,
        //     finalPositionSize
        // });
        
        return finalPositionSize;
    }
}