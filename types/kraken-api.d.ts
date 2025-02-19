declare module 'kraken-api' {
  export default class KrakenClient {
    constructor(key: string, secret: string);
    api(method: string, params?: any): Promise<any>;
  }
}
