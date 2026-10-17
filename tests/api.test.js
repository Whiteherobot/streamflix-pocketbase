// Pruebas contra un PocketBase levantado con docker compose (BASE_URL).
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:8090';
const EDITOR = { identity: process.env.EDITOR_EMAIL || 'editor@streamflix.local', password: process.env.EDITOR_PASSWORD || 'editor-2026' };

async function api(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: r.status, datos: await r.json().catch(() => null) };
}

let token;
before(async () => {
  const r = await api('/api/collections/editores/auth-with-password', { metodo: 'POST', cuerpo: EDITOR });
  assert.equal(r.status, 200, 'el editor de prueba tiene que existir');
  token = r.datos.token;
});

const unico = () => `Prueba ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;

test('el catálogo se lee sin sesión, con géneros y reparto', async () => {
  const r = await api('/api/collections/peliculas/records?filter=' + encodeURIComponent("titulo='Relatos salvajes'") + '&expand=generos,reparto');
  assert.equal(r.status, 200);
  const p = r.datos.items[0];
  assert.deepEqual(p.expand.generos.map((g) => g.nombre).sort(), ['Comedia', 'Drama']);
  assert.equal(p.expand.reparto[0].nombre, 'Ricardo Darín');
  const series = await api('/api/collections/series/records?perPage=50');
  assert.ok(series.datos.items.some((s) => s.titulo === 'Dark' && s.temporadas === 3));
});

test('sin sesión no se puede crear, editar ni borrar', async () => {
  const crear = await api('/api/collections/generos/records', { metodo: 'POST', cuerpo: { nombre: unico() } });
  assert.ok([400, 403].includes(crear.status));
  const dark = (await api('/api/collections/series/records?filter=' + encodeURIComponent("titulo='Dark'"))).datos.items[0];
  assert.equal((await api(`/api/collections/series/records/${dark.id}`, { metodo: 'PATCH', cuerpo: { titulo: 'x' } })).status, 404);
  assert.equal((await api(`/api/collections/series/records/${dark.id}`, { metodo: 'DELETE' })).status, 404);
  assert.equal((await api('/api/collections/editores/records', { metodo: 'POST', cuerpo: { email: 'x@x.com', password: '12345678', passwordConfirm: '12345678' } })).status, 403);
});

test('un editor crea un género y una película con sus relaciones', async () => {
  const genero = await api('/api/collections/generos/records', { metodo: 'POST', token, cuerpo: { nombre: unico() } });
  assert.equal(genero.status, 200);
  const titulo = unico();
  const peli = await api('/api/collections/peliculas/records', {
    metodo: 'POST', token,
    cuerpo: { titulo, estreno: '2020-05-01 00:00:00.000Z', duracion_min: 95, generos: [genero.datos.id] },
  });
  assert.equal(peli.status, 200);
  assert.equal(peli.datos.descargas, 0);
  const publica = await api(`/api/collections/peliculas/records/${peli.datos.id}?expand=generos`);
  assert.equal(publica.datos.expand.generos[0].id, genero.datos.id);
  assert.equal((await api(`/api/collections/peliculas/records/${peli.datos.id}`, { metodo: 'DELETE', token })).status, 204);
});

test('valida los datos y no deja repetir géneros', async () => {
  const sinTitulo = await api('/api/collections/series/records', { metodo: 'POST', token, cuerpo: { estreno: '2020-01-01 00:00:00.000Z', temporadas: 1 } });
  assert.equal(sinTitulo.status, 400);
  assert.ok(sinTitulo.datos.data.titulo);
  const temporadas = await api('/api/collections/series/records', { metodo: 'POST', token, cuerpo: { titulo: unico(), estreno: '2020-01-01 00:00:00.000Z', temporadas: 0 } });
  assert.equal(temporadas.status, 400);
  assert.equal((await api('/api/collections/generos/records', { metodo: 'POST', token, cuerpo: { nombre: 'drama' } })).status, 400);
});

test('ni un editor fija el contador de descargas a mano', async () => {
  const r = await api('/api/collections/peliculas/records', {
    metodo: 'POST', token, cuerpo: { titulo: unico(), estreno: '2020-01-01 00:00:00.000Z', descargas: 5000 },
  });
  assert.equal(r.status, 400);
});

test('las descargas simultáneas se cuentan todas', async () => {
  const coco = (await api('/api/collections/peliculas/records?filter=' + encodeURIComponent("titulo='Coco'"))).datos.items[0];
  await Promise.all(Array.from({ length: 25 }, () => api(`/api/descargas/peliculas/${coco.id}`, { metodo: 'POST' })));
  const despues = (await api(`/api/collections/peliculas/records/${coco.id}`)).datos.descargas;
  assert.equal(despues, coco.descargas + 25);
  assert.equal((await api(`/api/descargas/generos/${coco.id}`, { metodo: 'POST' })).status, 404);
  assert.equal((await api('/api/descargas/peliculas/noexiste00000', { metodo: 'POST' })).status, 404);
});

test('la página se sirve desde PocketBase y no arma HTML con datos', async () => {
  const r = await fetch(BASE + '/');
  assert.match(await r.text(), /StreamFlix/);
  const app = fs.readFileSync(path.join(__dirname, '..', 'pb_public', 'app.js'), 'utf8');
  assert.equal((app.match(/innerHTML/g) || []).length, 0, 'todo con textContent / nodos');
});
