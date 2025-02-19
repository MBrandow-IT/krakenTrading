import { TradingConfig } from '../config/tradingConfigurations';
import { Portfolio } from '../dataCollection/tradingEngine';
import pkg from 'kraken-api';
const KrakenClient = pkg;

const kraken = new KrakenClient(
  process.env.KRAKEN_API_KEY || '',
  process.env.KRAKEN_API_SECRET || ''
);

export const portfolio = async (config: TradingConfig): Promise<Portfolio> => {
  // if (config.tradeOnKraken) {
  //     const balance = await getBalance();
  //     if (balance < config.tradeBalance) {
  //         console.log('Not enough balance to trade, please add more funds to your Kraken account, will initialize using tradeBalance');
  //         return {
  //             balance: balance,
  //             positions: new Map(),
  //             availableBalance: balance
  //         }
  //     } else {
  //         return {
  //             balance: config.tradeBalance,
  //             positions: new Map(),
  //             availableBalance: config.tradeBalance
  //         }
  //     }
  // }
  return {
    balance: config.tradeBalance,
    positions: new Map(),
    availableBalance: config.tradeBalance,
  };
};

const getBalance = async () => {
  try {
    const balance = await kraken.api('Balance');
    console.log('Account Balance:', balance.result);
    return balance.result.ZUSD;
  } catch (error) {
    console.error('Error getting balance:', error);
  }
};
