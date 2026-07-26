import * as Joi from 'joi';

// Security-hygiene audit fix — JWT_SECRET being left at its .env.example
// placeholder in production would silently sign every session with a value
// an attacker can read straight off GitHub. This makes that fail loudly at
// boot instead of quietly working. Deliberately scoped to JWT_SECRET only
// (not every env var) — `.unknown(true)` lets every other variable
// (DB_HOST, REDIS_PORT, CORS_ORIGIN, ...) pass through unvalidated, since
// tightening those wasn't part of this fix and listing them all here would
// just be a second, driftable copy of database.config.ts/redis.config.ts.
const KNOWN_PLACEHOLDER_SUBSTRINGS = [
  'changemeinproduction', // .env.example's literal default, separators stripped
  'changeme',
  'yoursecretkey',
  'placeholder',
  'examplesecret',
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[-_\s]/g, '');
}

export const envValidationSchema = Joi.object({
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .custom((value: string, helpers) => {
      const normalized = normalize(value);
      const looksLikePlaceholder = KNOWN_PLACEHOLDER_SUBSTRINGS.some(
        (bad) => normalized.includes(bad),
      );
      return looksLikePlaceholder ? helpers.error('jwtSecret.placeholder') : value;
    })
    .messages({
      'string.min':
        'JWT_SECRET must be at least 32 characters long — set a long random value, not the .env.example placeholder',
      'any.required': 'JWT_SECRET is required',
      'jwtSecret.placeholder':
        'JWT_SECRET looks like a placeholder value (e.g. "change-me-in-production") — generate a real random secret before starting the app',
    }),
}).unknown(true);
