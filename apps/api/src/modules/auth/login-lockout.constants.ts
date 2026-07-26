// DI token for the raw ioredis client the login lockout counter uses.
// Deliberately a separate low-level client from BullMQ's (which
// @nestjs/bullmq manages internally and doesn't expose for arbitrary
// commands) — configured from the SAME `redis.host`/`redis.port` config
// values as BullModule.forRootAsync in app.module.ts, so it targets the
// identical Redis server/config rather than introducing a second one.
export const LOGIN_LOCKOUT_REDIS = Symbol('LOGIN_LOCKOUT_REDIS');
