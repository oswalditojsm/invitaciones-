import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.execute(statement);
  }

  console.log('✅ Migración completada: tabla "guests" lista en Turso.');
}

migrate().catch((err) => {
  console.error('❌ Error al migrar:', err);
  process.exit(1);
});
