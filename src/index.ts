import 'dotenv/config';

import { TradingEngine } from "./dataCollection/tradingEngine";
import { scalpingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig } from "./config/tradingConfigurations";
import { trackedCoins } from "./trackedCoins";
import { portfolio } from './portfolio/portfolio';

const startTrading = async () => {
    console.log('🚀 Initializing trading system...');
    
    const configs = [trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig, scalpingConfig];
    for (const config of configs) {
        try {
            if (config.active) continue;
            
            const engine = new TradingEngine(config);
            
            console.log('📊 Trading configuration:', {
                strategy: config.strategyType,
                interval: `${config.intervalMinutes} minutes`,
                requiredCandles: config.minimumRequiredCandles,
                maxPositions: config.max_positions,
                rsiPeriod: config.rsiPeriod
            });

        // Add error handling
        process.on('unhandledRejection', (error) => {
            console.error('❌ Unhandled rejection:', error);
        });

        process.on('SIGINT', () => {
            console.log('👋 Gracefully shutting down...');
            // Add cleanup code here if needed
            process.exit(0);
        });

            const portfolioBalance = await portfolio(config);
            console.log('🔄 Portfolio balance:', portfolioBalance);
            console.log('🔄 Connecting to exchange...');
            await engine.initialize(trackedCoins, portfolioBalance);
            console.log('✅ Trading engine initialized successfully');
        } catch (error) {
            console.error('❌ Error starting trading engine:', error);
            process.exit(1);
        }
    }
}

// Actually call the function to start everything
console.log('🎯 Starting trading application...');
startTrading().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
