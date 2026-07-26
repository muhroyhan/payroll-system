import { envValidationSchema } from './env-validation.schema';

describe('envValidationSchema', () => {
  const LONG_RANDOM_SECRET =
    'kQ8x2mZ7vL1pR9tY4wJ6nB3sF0hD5cA8eG2iU7oX1qK4rM6z';

  function validate(env: Record<string, string | undefined>) {
    return envValidationSchema.validate(env, { abortEarly: false });
  }

  it('boot fails when JWT_SECRET is missing entirely', () => {
    const { error } = validate({ DB_HOST: '127.0.0.1' });
    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET is required');
  });

  it('boot fails when JWT_SECRET is shorter than 32 characters, even if not a known placeholder', () => {
    const { error } = validate({ JWT_SECRET: 'short-but-not-a-placeholder-1' });
    expect(error).toBeDefined();
    expect(error?.message).toContain('at least 32 characters');
  });

  it.each([
    ['change-me-in-production'.padEnd(40, '0')], // the literal .env.example default, padded to pass length
    ['CHANGE-ME-IN-PRODUCTION'.padEnd(40, '0')], // case-insensitive
    ['ChangeMe123!'.padEnd(40, '0')], // the seeder's ADMIN_PASSWORD-style default, same family
    ['your-secret-key-your-secret-key-here'],
    ['this-is-just-a-placeholder-value-ok'],
  ])(
    'boot fails when JWT_SECRET is a recognizable placeholder ("%s"), even if long enough',
    (value) => {
      const { error } = validate({ JWT_SECRET: value });
      expect(error).toBeDefined();
      expect(error?.message).toContain('placeholder');
    },
  );

  it('boots successfully with a long, non-placeholder JWT_SECRET', () => {
    const { error, value } = validate({ JWT_SECRET: LONG_RANDOM_SECRET });
    expect(error).toBeUndefined();
    expect(value.JWT_SECRET).toBe(LONG_RANDOM_SECRET);
  });

  it('does not reject unrelated/unknown env vars (DB_HOST, REDIS_PORT, CORS_ORIGIN, ...)', () => {
    const { error } = validate({
      JWT_SECRET: LONG_RANDOM_SECRET,
      DB_HOST: '127.0.0.1',
      DB_PORT: '3306',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      CORS_ORIGIN: 'http://localhost:3001',
      NODE_ENV: 'production',
      SOME_TOTALLY_UNRELATED_VAR: 'anything',
    });
    expect(error).toBeUndefined();
  });
});
