const ADMIN_USER = 'admin';

const viewLogin = document.getElementById('view-login');
const viewBadge = document.getElementById('view-badge');
const viewAdmin = document.getElementById('view-admin');
const usernameInput = document.getElementById('username');
const adminKeyField = document.getElementById('adminKeyField');
const adminKeyInput = document.getElementById('adminKey');

function showView(view) {
  viewLogin.style.display = view === 'login' ? 'block' : 'none';
  viewBadge.style.display = view === 'badge' ? 'block' : 'none';
  viewAdmin.style.display = view === 'admin' ? 'block' : 'none';
}

usernameInput.addEventListener('input', () => {
  adminKeyField.style.display = usernameInput.value.trim().toLowerCase() === ADMIN_USER ? 'block' : 'none';
});

let currentGuestName = null;

async function handleLogin() {
  const errorEl = document.getElementById('loginError');
  const name = usernameInput.value.trim();
  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = 'Escribe tu nombre para continuar.';
    return;
  }

  if (name.toLowerCase() === ADMIN_USER) {
    const key = adminKeyInput.value;
    if (!key) {
      errorEl.textContent = 'Ingresa la clave de administrador.';
      return;
    }
    try {
      const res = await fetch('/api/admin/guests', { headers: { 'x-admin-key': key } });
      if (!res.ok) {
        errorEl.textContent = 'Clave incorrecta.';
        return;
      }
      const data = await res.json();
      window.sessionStorage.setItem('adminKey', key);
      showView('admin');
      renderAdmin(data.guests);
    } catch (e) {
      errorEl.textContent = 'No se pudo conectar con el servidor.';
    }
    return;
  }

  try {
    const res = await fetch('/api/guests/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.error || 'No se pudo registrar tu acceso.';
      return;
    }
    const guest = await res.json();
    currentGuestName = guest.username;
    document.getElementById('guestName').textContent = guest.username;
    showView('badge');
    if (guest.confirmed) {
      showStampedState(guest.confirmedAt);
    }
  } catch (e) {
    errorEl.textContent = 'No se pudo conectar con el servidor.';
  }
}

function showStampedState(confirmedAt) {
  document.getElementById('btnConfirmar').style.display = 'none';
  const stamp = document.getElementById('stamp');
  stamp.classList.add('show');
  const when = confirmedAt
    ? new Date(confirmedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  document.getElementById('statusNote').textContent = when ? 'Confirmaste tu asistencia el ' + when : 'Asistencia confirmada';
}

async function handleConfirm() {
  if (!currentGuestName) return;
  const btn = document.getElementById('btnConfirmar');
  btn.disabled = true;
  btn.textContent = 'Confirmando…';

  try {
    const res = await fetch('/api/guests/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentGuestName }),
    });
    if (!res.ok) throw new Error('fail');
    const data = await res.json();
    showStampedState(data.confirmedAt);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Confirmar mi asistencia';
    document.getElementById('statusNote').textContent = 'No se pudo confirmar. Intenta de nuevo.';
  }
}

function renderAdmin(guests) {
  const body = document.getElementById('rosterBody');
  const empty = document.getElementById('emptyRoster');
  const count = document.getElementById('adminCount');
  body.innerHTML = '';

  if (!guests || guests.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    guests.forEach((g) => {
      const tr = document.createElement('tr');
      const openedAt = g.openedAt
        ? new Date(g.openedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '— no ha entrado —';
      const pill = g.confirmed
        ? '<span class="pill confirmed">Confirmado</span>'
        : '<span class="pill pending">Pendiente</span>';
      tr.innerHTML = `<td>${escapeHtml(g.username)}</td><td>${openedAt}</td><td>${pill}</td><td><button class="btn-remove" data-username="${escapeHtml(g.username)}">Quitar</button></td>`;
      body.appendChild(tr);
    });
  }
  const confirmedCount = (guests || []).filter((g) => g.confirmed).length;
  count.textContent = confirmedCount + ' confirmado' + (confirmedCount === 1 ? '' : 's') + ' de ' + (guests || []).length;

  body.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => handleRemoveGuest(btn.dataset.username));
  });
}

async function refreshAdminList() {
  const key = window.sessionStorage.getItem('adminKey');
  if (!key) return;
  const res = await fetch('/api/admin/guests', { headers: { 'x-admin-key': key } });
  if (res.ok) {
    const data = await res.json();
    renderAdmin(data.guests);
  }
}

async function handleAddGuest() {
  const input = document.getElementById('newGuestName');
  const errorEl = document.getElementById('addGuestError');
  const name = input.value.trim();
  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = 'Escribe un nombre.';
    return;
  }

  const key = window.sessionStorage.getItem('adminKey');
  try {
    const res = await fetch('/api/admin/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ username: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'No se pudo agregar.';
      return;
    }
    input.value = '';
    refreshAdminList();
  } catch (e) {
    errorEl.textContent = 'No se pudo conectar con el servidor.';
  }
}

async function handleRemoveGuest(username) {
  const key = window.sessionStorage.getItem('adminKey');
  try {
    await fetch('/api/admin/guests/' + encodeURIComponent(username), {
      method: 'DELETE',
      headers: { 'x-admin-key': key },
    });
    refreshAdminList();
  } catch (e) {
    // silencioso: si falla, el usuario puede intentar de nuevo con el botón Actualizar
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('btnEntrar').addEventListener('click', handleLogin);
usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && adminKeyField.style.display === 'none') handleLogin(); });
adminKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
document.getElementById('btnConfirmar').addEventListener('click', handleConfirm);
document.getElementById('btnRefresh').addEventListener('click', refreshAdminList);
document.getElementById('btnAddGuest').addEventListener('click', handleAddGuest);
document.getElementById('newGuestName').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddGuest(); });

showView('login');
