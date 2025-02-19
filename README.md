# Kraken Trading Bot

An automated cryptocurrency trading bot that implements multiple trading strategies using the Kraken API. The bot supports mean reversion, trend following, scalping, and volatility breakout strategies.

Note: All crypto trading carries significant risks, this bot is to be used as the users own research and due diligence.

## Features

- Multiple trading strategies:
  - Mean Reversion
  - Trend Following
  - Scalping
  - Volatility Breakout
- Real-time market data processing
- Dynamic position sizing
- Automated trade execution
- Database integration for trade tracking
- Configurable risk management
- Support for multiple cryptocurrency pairs

## Prerequisites

- Node.js (v16 or higher)
- TypeScript
- MS SQL Server
- Kraken Account with API access

## Installation

1. Clone the repository:
   git clone <repository-url>
   cd krakentrading

2. Install dependencies:
   npm install

3. Create a `.env` file in the root directory with the following variables:
   KRAKEN_API_KEY=your_kraken_api_key
   KRAKEN_API_SECRET=your_kraken_api_secret
   COINGECKO_API_KEY=your_coingecko_api_key

The DB credentials are optional, if you don't want to configure a local SQL instance you can set the bot to not create any DB trades by setting the config.paperTrade to false.
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SERVER=your_db_server
DB_NAME=db_CryptoTracker

4. Build the project:
   npm run build

## Configuration

The trading strategies can be configured in the `src/config/tradingConfigurations.ts` file. Each strategy has its own set of parameters that can be adjusted:

- RSI thresholds
- MACD parameters
- Position sizing
- Stop loss and take profit levels
- Timeframes
- Volatility thresholds

## Usage

1. Start the trading bot in development mode:
   npm run dev

2. Start the trading bot in production mode:
   npm run start

## Database Setup

The project uses a local SQL instance to store the trades and portfolio data optionally, install scripts are stored in the `install` folder.

## Trading Pairs

The bot supports multiple trading pairs which can be configured in `src/trackedCoins.ts`. By default, it includes all coins tracked by Kraken.

## Risk Management

The bot implements several risk management features:

- Dynamic position sizing based on account balance
- Adjustable stop-loss levels
- Maximum position limits
- Volatility-based trade filtering

## Monitoring

The bot provides console logging for:

- Trade entries and exits
- Position updates
- Error handling

## Development

To contribute to the project:

1. Create a new branch
2. Make your changes
3. Run tests (when implemented)
4. Submit a pull request

## Security Notes

- Never commit your `.env` file
- Keep your API keys secure
- Use appropriate permission levels for API keys
- Monitor your trading activity regularly

## License

ISC

## Disclaimer

Cryptocurrency trading carries significant risks. Always test thoroughly with small amounts before deploying with real funds.
