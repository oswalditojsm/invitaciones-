import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

function normalize(username) {
  return username.trim().toLowerCase();
}

function requireAdmin(req, res) {
  const key = req.header('x-admin-key');
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    res.status(401).json({ error: 'Clave de administrador incorrecta.' });
    return false;
  }
  return true;
}

// Salud del servicio
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Un invitado intenta entrar -> solo funciona si el admin lo agregó antes a la lista
app.post('/api/guests/open', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    const key = normalize(username);

    const existing = await db.execute({
      sql: `SELECT username, opened_at, confirmed, confirmed_at FROM guests WHERE username = ?`,
      args: [key],
    });

    if (existing.rows.length === 0) {
      return res.status(403).json({ error: 'No estás en la lista de invitados. Contacta al organizador del evento.' });
    }

    const row = existing.rows[0];

    if (!row.opened_at) {
      const now = new Date().toISOString();
      await db.execute({
        sql: `UPDATE guests SET opened_at = ? WHERE username = ?`,
        args: [now, key],
      });
      row.opened_at = now;
    }

    res.json({
      username: username.trim(),
      openedAt: row.opened_at,
      confirmed: !!row.confirmed,
      confirmedAt: row.confirmed_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo registrar tu acceso.' });
  }
});

// Un invitado confirma asistencia (debe estar ya en la lista)
app.post('/api/guests/confirm', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    const key = normalize(username);
    const now = new Date().toISOString();

    const result = await db.execute({
      sql: `UPDATE guests SET confirmed = 1, confirmed_at = ? WHERE username = ?`,
      args: [now, key],
    });

    if (result.rowsAffected === 0) {
      return res.status(403).json({ error: 'No estás en la lista de invitados.' });
    }

    res.json({ confirmed: true, confirmedAt: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo confirmar tu asistencia.' });
  }
});

// Admin: lista de todos los invitados
app.get('/api/admin/guests', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.execute(
      `SELECT username, invited_at, opened_at, confirmed, confirmed_at FROM guests ORDER BY username ASC`
    );
    const guests = result.rows.map((row) => ({
      username: row.username,
      invitedAt: row.invited_at,
      openedAt: row.opened_at,
      confirmed: !!row.confirmed,
      confirmedAt: row.confirmed_at,
    }));
    res.json({ guests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo obtener la lista de invitados.' });
  }
});

// Admin: agregar un invitado a la lista
app.post('/api/admin/guests', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    const key = normalize(username);
    const now = new Date().toISOString();

    const result = await db.execute({
      sql: `INSERT INTO guests (username, invited_at) VALUES (?, ?)
            ON CONFLICT(username) DO NOTHING`,
      args: [key, now],
    });

    if (result.rowsAffected === 0) {
      return res.status(409).json({ error: 'Ese nombre ya está en la lista.' });
    }

    res.json({ username: username.trim(), invitedAt: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo agregar al invitado.' });
  }
});

// Admin: quitar un invitado de la lista
app.delete('/api/admin/guests/:username', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const key = normalize(req.params.username);
    await db.execute({
      sql: `DELETE FROM guests WHERE username = ?`,
      args: [key],
    });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo eliminar al invitado.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
