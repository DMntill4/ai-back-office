import { describe, it, expect } from 'vitest';
import { env } from '../src/config/env';
import { logger } from '../src/lib/logger';

describe('Configuración y Logging', () => {
  it('debe cargar y validar las variables de entorno por defecto con zod', () => {
    expect(env).toBeDefined();
    expect(env.NODE_ENV).toMatch(/^(development|production|test)$/);
    expect(env.LOG_LEVEL).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
  });

  it('debe tener una instancia activa de logger con pino', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
