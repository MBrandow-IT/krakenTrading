import WebSocket from 'ws';

export class KrakenWebSocket {
  private ws: WebSocket;
  private symbols: string[];
  private onMessageCallback: (data: any) => void;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private intervalMinutes: number;

  constructor(symbols: string[], intervalMinutes: number, onMessage: (data: any) => void) {
    this.symbols = symbols;
    this.intervalMinutes = intervalMinutes;
    this.onMessageCallback = onMessage;
    this.ws = this.connect();
  }

  private connect(): WebSocket {
    console.log(
      `[WebSocket] Connecting to Kraken for ${this.symbols.length} symbols with ${this.intervalMinutes}min intervals...`
    );
    const ws = new WebSocket('wss://ws.kraken.com/v2');

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log(`[WebSocket] Connected successfully for ${this.symbols.length} symbols`);

      // Subscribe to OHLC data
      const ohlcSubscription = {
        method: 'subscribe',
        params: {
          channel: 'ohlc',
          symbol: this.symbols,
          interval: this.intervalMinutes,
          snapshot: false,
        },
      };

      const tradeSubscription = {
        method: 'subscribe',
        params: {
          channel: 'trade',
          symbol: this.symbols,
        },
      };

      console.log(
        `[WebSocket] Subscribing to OHLC-${this.intervalMinutes} for ${this.symbols.length} symbols`
      );
      ws.send(JSON.stringify(ohlcSubscription));
      console.log(`[WebSocket] Subscribing to trades for ${this.symbols.length} symbols`);
      ws.send(JSON.stringify(tradeSubscription));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        // Log subscription confirmations
        if (data.event === 'subscriptionStatus') {
          console.log(`[WebSocket] Subscription status for ${this.symbols}:`, data.status);
          return;
        }
        this.onMessageCallback(data);
      } catch (error) {
        console.error(`[WebSocket] Error processing message for ${this.symbols}:`, error);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WebSocket] Error for ${this.symbols}:`, error);
    };

    ws.onclose = () => {
      console.log(`[WebSocket] Connection closed for ${this.symbols}`);
      this.handleDisconnect();
    };

    return ws;
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Add jitter to prevent thundering herd
      const baseDelay = 5000; // 5 seconds
      const maxJitter = 1000; // 1 second
      const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
      const jitter = Math.random() * maxJitter;
      const delay = exponentialDelay + jitter;

      console.log(
        `[WebSocket] Connection failed for ${this.symbols}. ` +
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) ` +
          `in ${Math.round(delay / 1000)} seconds...`
      );

      setTimeout(() => {
        this.ws = this.connect();
      }, delay);
    } else {
      console.error(
        `[WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${this.symbols.length} symbols`
      );
      // You might want to emit an event here or implement a recovery strategy
    }
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}
