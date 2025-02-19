import sql from 'mssql';

interface PoolOptions {
  name: string;
  config: sql.config;
}

class PoolManager {
  private static instance: PoolManager;
  private pools: Map<string, sql.ConnectionPool>;

  private constructor() {
    this.pools = new Map();
  }

  public static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  private async set({ name, config }: PoolOptions): Promise<sql.ConnectionPool> {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    // Extend pool's close method to remove from pool map
    const originalClose = pool.close.bind(pool);

    // @ts-ignore
    pool.close = async (...args) => {
      this.pools.delete(name);
      // @ts-ignore
      return await originalClose(...args);
    };

    this.pools.set(name, pool);
    return pool;
  }

  public async get(options: PoolOptions): Promise<sql.ConnectionPool> {
    if (!this.pools.has(options.name)) {
      return await this.set(options);
    }
    return this.pools.get(options.name)!;
  }

  public async close(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Pool ${name} does not exist`);
    }
    await pool.close();
  }

  public async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((pool) => pool.close());
    await Promise.all(promises);
  }
}

export default PoolManager;
