import IORedis from "ioredis";

// Singleton pattern for ioredis (local Redis at 127.0.0.1:6379)
const globalForRedis = globalThis as unknown as { localRedis?: IORedis };

export const localRedis =
    globalForRedis.localRedis ??
    new IORedis({
        host: process.env.LOCAL_REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.LOCAL_REDIS_PORT || "6379"),
        // Use a dedicated DB index (1) so it doesn't interfere with anything else on the same server
        db: 1,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });

if (process.env.NODE_ENV !== "production") {
    globalForRedis.localRedis = localRedis;
}
