import 'dotenv/config';

import { TradingEngine } from "./dataCollection/tradingEngine";
import { scalpingConfig, trendFollowingConfig, longTrendFollowingConfig, meanReversionConfig, volatilityBreakoutConfig } from "./config/tradingConfigurations";
import { trackedCoins } from "./trackedCoins";

const startTrading = async () => {
    console.log('🚀 Initializing trading system...');
    
    try {
        const engine = new TradingEngine(trendFollowingConfig);

        // console.log('API KEY', process.env.KRAKEN_API_KEY)
        
        console.log('📊 Trading configuration:', {
            strategy: trendFollowingConfig.strategyType,
            interval: `${trendFollowingConfig.intervalMinutes} minutes`,
            requiredCandles: trendFollowingConfig.minimumRequiredCandles,
            maxPositions: trendFollowingConfig.max_positions,
            rsiPeriod: trendFollowingConfig.rsiPeriod
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

        // Start the engine with the trading pair
        console.log('🔄 Connecting to exchange...');
        await engine.initialize(trackedCoins); // Changed from BTCUSD to XBT/USD
        console.log('✅ Trading engine initialized successfully');
        
    } catch (error) {
        console.error('❌ Error starting trading engine:', error);
        process.exit(1);
    }
}

// Actually call the function to start everything
console.log('🎯 Starting trading application...');
startTrading().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
