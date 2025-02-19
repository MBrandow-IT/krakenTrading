import 'dotenv/config';

import { TradingEngine } from "./dataCollection/tradingEngine";
import { scalpingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig, longerTrendFollowingConfig } from "./config/tradingConfigurations";
import { trackedCoins } from "./trackedCoins";
import { portfolio } from './portfolio/portfolio';
import { executeQueryWithRetry } from './database/sqlconnection';
import readline from 'readline';
readline.emitKeypressEvents(process.stdin);

let engines: TradingEngine[] = []; // Store references to all engines

const startTrading = async () => {
    console.log('🚀 Initializing trading system...');
    
    const configs = [longerTrendFollowingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig, scalpingConfig];
    const activeConfigs = configs.filter(config => config.active);
    
    const options = async (signal: string) => {
        if (signal === 'prompted') {
            console.log('🔄 Options:');
            console.log('🔄 1. Do not allow new orders');
            console.log('🔄 2. Allow new orders');
            console.log('🔄 3. Exit');

            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            
        }
    }

    const noNewOrders = () => {
        for (const engine of engines) {
            engine.placeNewOrder = false;
        }
    }

    const allowNewOrders = () => {
        for (const engine of engines) {
            engine.placeNewOrder = true;
        }
    }
    
    
    try {
        // Initialize all engines in parallel
        await Promise.all(activeConfigs.map(async (config) => {
            try {
                let activePositions = new Map();

                try {
                    const result = await executeQueryWithRetry(`SELECT symbol, entry_price, amount AS quantity, '${config.strategyType}' AS strategy, Opened_at AS entryTime, peak_price AS peakPrice FROM trades WHERE portfolio_id = ${config.portfolio_ID} AND test_case = '${process.env.TEST_CASE}' AND closed_at IS NULL`);
                    const activeTrades = result.recordset;
                    activeTrades.forEach((trade: any) => {
                        activePositions.set(trade.symbol, {
                            entryPrice: trade.entry_price,
                            quantity: trade.quantity,
                            strategy: trade.strategy,
                            entryTime: trade.entryTime,
                            peakPrice: trade.peakPrice
                        });
                    });
                } catch (error) {
                    console.error('Error getting active positions:', error);
                }
                
                const engine = new TradingEngine(config, activePositions);
                engines.push(engine); // Store engine reference
                
                console.log('📊 Trading configuration:', {
                    strategy: config.strategyType,
                    interval: `${config.intervalMinutes} minutes`,
                    requiredCandles: config.minimumRequiredCandles,
                    maxPositions: config.max_positions,
                    rsiPeriod: config.rsiPeriod
                });
                const portfolioBalance = await portfolio(config); // Assuming same balance check for all configs
                
                console.log(`🔄 Connecting to exchange for ${config.strategyType}...`);
                console.log(`🔄 Portfolio balance: ${portfolioBalance.balance}`);
                await engine.initialize(trackedCoins, portfolioBalance);
                console.log(`✅ Trading engine initialized successfully for ${config.strategyType}`);
            } catch (error) {
                console.error(`❌ Error starting trading engine for ${config.strategyType}:`, error);
                throw error; // Re-throw to be caught by Promise.all
            }
        }));

        // Setup shutdown handlers
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Closing all positions...`);
            try {
                await Promise.all(engines.map(async (engine) => {
                    try {
                        await engine.closeAllPositions();
                    } catch (error) {
                        console.error('Error closing positions:', error);
                    }
                }));
                console.log('✅ All positions closed successfully');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        };

        // Handle different termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

    } catch (error) {
        console.error('❌ Error in trading system:', error);
        process.exit(1);
    }

    process.stdin.on('keypress', (key) => {
        if (key.ctrl && key.name === 'o') {
          options('prompted');
        }
      });
}

// Actually call the function to start everything
console.log('🎯 Starting trading application...');
startTrading().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
