import 'dotenv/config';

import { TradingEngine } from "./dataCollection/tradingEngine";
import { scalpingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig } from "./config/tradingConfigurations";
import { trackedCoins } from "./trackedCoins";
import { portfolio } from './portfolio/portfolio';

const startTrading = async () => {
    console.log('🚀 Initializing trading system...');
    
    const configs = [trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig, scalpingConfig];
    const activeConfigs = configs.filter(config => config.active);
    
    try {
        // Get portfolio balance once for all engines
        const portfolioBalance = await portfolio(activeConfigs[0]); // Assuming same balance check for all configs
        console.log('🔄 Portfolio balance:', portfolioBalance);
        
        // Initialize all engines in parallel
        await Promise.all(activeConfigs.map(async (config) => {
            try {
                const engine = new TradingEngine(config);
                
                console.log('📊 Trading configuration:', {
                    strategy: config.strategyType,
                    interval: `${config.intervalMinutes} minutes`,
                    requiredCandles: config.minimumRequiredCandles,
                    maxPositions: config.max_positions,
                    rsiPeriod: config.rsiPeriod
                });
                
                console.log(`🔄 Connecting to exchange for ${config.strategyType}...`);
                await engine.initialize(trackedCoins, portfolioBalance);
                console.log(`✅ Trading engine initialized successfully for ${config.strategyType}`);
            } catch (error) {
                console.error(`❌ Error starting trading engine for ${config.strategyType}:`, error);
                throw error; // Re-throw to be caught by Promise.all
            }
        }));
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
