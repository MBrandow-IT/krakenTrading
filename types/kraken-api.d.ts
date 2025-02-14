declare module 'kraken-api' {
    class KrakenClient {
        constructor(key: string, secret: string);
        api(method: string, params?: any): Promise<any>;
    }
    export = KrakenClient;
}