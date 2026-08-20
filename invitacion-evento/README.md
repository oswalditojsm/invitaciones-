# Invitación Evento

Invitación digital con login por nombre (sin contraseña para invitados), confirmación de asistencia y panel de administrador. Backend en Node.js/Express, base de datos en Turso (SQLite distribuido).

## 1. Crear la base de datos en Turso

Instala el CLI de Turso (si no lo tienes):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Inicia sesión y crea la base de datos:

```bash
turso auth login
turso db create invitacion-evento
```

Obtén la URL y el token de acceso:

```bash
turso db show invitacion-evento --url
turso db tokens create invitacion-evento
```

Copia ambos valores, los necesitas en el siguiente paso.

## 2. Configurar el proyecto localmente

```bash
cp .env.example .env
```

Edita `.env` y pega:
- `TURSO_DATABASE_URL` (la URL que obtuviste arriba, empieza con `libsql://`)
- `TURSO_AUTH_TOKEN` (el token que generaste)
- `ADMIN_KEY` (inventa una clave para entrar al panel de administrador)

Instala dependencias y crea la tabla en la base de datos:

```bash
npm install
npm run migrate
```

## 3. Probar en local

```bash
npm start
```

Abre `http://localhost:3000`. Para probar el panel de administrador, escribe **admin** como nombre y pon la clave que definiste en `ADMIN_KEY`.

## 4. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Invitación digital lista para deploy"
```

Crea un repositorio en GitHub y súbelo:

```bash
git remote add origin https://github.com/tu-usuario/invitacion-evento.git
git push -u origin main
```

## 5. Deploy en Render

1. Entra a [render.com](https://render.com) y crea una cuenta si no tienes.
2. **New +** → **Web Service** → conecta tu repositorio de GitHub.
3. Render detectará el archivo `render.yaml` automáticamente (o configura manualmente: Build Command `npm install`, Start Command `npm start`).
4. En la sección **Environment**, agrega las variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_KEY`
5. Dale a **Create Web Service**. Render construirá y desplegará el proyecto.
6. Cuando termine, tendrás una URL tipo `https://invitacion-evento.onrender.com` — ese es el link que compartes con tus invitados.

> Nota: el plan gratuito de Render "duerme" el servicio tras un rato sin uso; la primera visita después de estar dormido puede tardar unos segundos en cargar.

## Cómo funciona

- Solo pueden entrar las personas que el administrador agregó a la lista de invitados. Si alguien escribe un nombre que no está en la lista, ve un mensaje de "No estás en la lista de invitados".
- Un invitado autorizado entra con su nombre → se guarda que "abrió" la invitación con fecha y hora.
- El invitado ve su credencial y presiona "Confirmar mi asistencia" → se marca como confirmado.
- Si alguien entra con el nombre **admin** y la clave correcta, ve el panel donde puede:
  - Agregar nuevos invitados a la lista (nombre por nombre).
  - Quitar a alguien de la lista.
  - Ver quién ha abierto el link y quién ya confirmó.

## Si ya tenías el proyecto desplegado (actualizar la tabla)

La estructura de la tabla `guests` cambió: antes cualquiera podía entrar y se registraba solo; ahora el administrador debe agregar primero a cada invitado. Si ya habías creado la tabla anteriormente, tienes que recrearla:

1. Entra a la consola SQL de tu base de datos en [turso.tech/app](https://turso.tech/app) (o con `turso db shell <nombre-db>` si tienes el CLI).
2. Ejecuta:

```sql
DROP TABLE IF EXISTS guests;

CREATE TABLE guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  invited_at TEXT NOT NULL,
  opened_at TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT
);
```

3. Sube el código actualizado a tu repositorio (Render lo redesplegará solo si está conectado a GitHub).
4. Entra al panel de administrador y empieza a agregar invitados.

## Personalizar el evento

Edita el nombre, fecha, lugar y código del evento directamente en `public/index.html` (las etiquetas `<h1 class="event-title">`, `<p class="event-meta">` y dentro del `.badge`).
