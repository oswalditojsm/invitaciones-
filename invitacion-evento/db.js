import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TURSO_DATABASE_URL) {
  console.warn('[aviso] TURSO_DATABASE_URL no está definida. Revisa tu archivo .env');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
