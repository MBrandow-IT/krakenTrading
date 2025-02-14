import { Portfolio } from "../dataCollection/tradingEngine";

export const portfolio = (): Portfolio => {
    // TODO: get portfolio from kraken
    return {
        balance: 10000,
        positions: new Map(),
        availableBalance: 10000
    }
}