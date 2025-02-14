import 'dotenv/config';

import { TradingEngine } from "./dataCollection/tradingEngine";
import { scalpingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig } from "./config/tradingConfigurations";
import { trackedCoins } from "./trackedCoins";
import { portfolio } from './portfolio/portfolio';

let engines: TradingEngine[] = []; // Store references to all engines

const startTrading = async () => {
    console.log('🚀 Initializing trading system...');
    
    const configs = [trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig, scalpingConfig];
    const activeConfigs = configs.filter(config => config.active);
    
    try {
        // Initialize all engines in parallel
        await Promise.all(activeConfigs.map(async (config) => {
            try {
                const engine = new TradingEngine(config);
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
}

// Actually call the function to start everything
console.log('🎯 Starting trading application...');
startTrading().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
