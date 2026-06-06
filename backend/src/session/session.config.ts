import type { INestApplication } from '@nestjs/common';
import type { CookieOptions } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? 'watermenu.sid';
}

export function getSessionCookieOptions(): CookieOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}

export function setupSession(app: INestApplication) {
  const secret = process.env.SESSION_SECRET;
  const databaseUrl = process.env.DATABASE_URL;

  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET 必须至少 32 个字符');
  }

  if (!databaseUrl) {
    throw new Error('缺少 DATABASE_URL，无法初始化 PostgreSQL Session Store');
  }

  const PgStore = connectPgSimple(session);
  const pool = new Pool({ connectionString: databaseUrl });
  const maxAge = Number(process.env.SESSION_MAX_AGE_MS ?? 604800000);

  app.use(
    session({
      name: getSessionCookieName(),
      secret,
      resave: false,
      saveUninitialized: false,
      store: new PgStore({
        pool,
        createTableIfMissing: true,
      }),
      cookie: {
        ...getSessionCookieOptions(),
        maxAge,
      },
    }),
  );

  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().on('close', () => {
    void pool.end();
  });
}
