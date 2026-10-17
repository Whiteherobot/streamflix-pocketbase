// El front lo sirve el mismo PocketBase (carpeta pb_public), así que la API
// está en el mismo origen.
const pb = new PocketBase(window.location.origin);

const $ = (id) => document.getElementById(id);
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'sus', 'y', 'un', 'una']);
const estado = { filtro: 'todo', peliculas: [], series: [], generos: [], actores: [] };

function el(tag, props = {}, hijos = []) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.append(...[].concat(hijos).filter((h) => h !== null && h !== undefined));
    return e;
}

function fecha(valor) {
    if (!valor) return 'Sin fecha';
    return new Date(valor).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function avisar(texto) {
    $('aviso').textContent = texto;
    $('aviso').hidden = !texto;
}

// Póster subido o, si no hay, las iniciales del título sobre un degradado.
function poster(registro, tamano) {
    const caja = el('div', { className: 'card-image' });
    if (registro.poster) {
        caja.append(el('img', {
            src: pb.files.getURL(registro, registro.poster, { thumb: tamano }),
            alt: `Póster de ${registro.titulo}`,
            loading: 'lazy',
        }));
    } else {
        const palabras = registro.titulo.split(/\s+/).filter((p) => !ARTICULOS.has(p.toLowerCase()));
        const iniciales = [palabras[0], palabras.length > 1 ? palabras.at(-1) : null]
            .filter(Boolean).map((p) => p[0].toUpperCase()).join('');
        // Un tono fijo por título, para que no todas las tarjetas sean iguales.
        const tono = [...registro.titulo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
        caja.style.background = `linear-gradient(135deg, hsl(${tono} 55% 45%), hsl(${(tono + 50) % 360} 60% 25%))`;
        caja.append(el('span', { className: 'iniciales', textContent: iniciales }));
    }
    return caja;
}

function tarjeta(registro, tipo) {
    const generos = registro.expand?.generos ?? [];
    const meta = tipo === 'series' ? `${registro.temporadas} temp.` : registro.duracion_min ? `${registro.duracion_min} min` : '';
    const card = el('button', { className: 'content-card', type: 'button' }, [
        poster(registro, '300x450'),
        el('div', { className: 'card-content' }, [
            el('h3', { className: 'card-title', textContent: registro.titulo }),
            el('div', { className: 'card-meta' }, [
                el('span', { className: 'meta-item', textContent: new Date(registro.estreno).getUTCFullYear() }),
                meta ? el('span', { className: 'meta-item', textContent: meta }) : null,
                el('span', { className: 'meta-item', textContent: `${registro.descargas} descargas` }),
            ]),
            generos.length
                ? el('div', { className: 'card-tags' }, generos.slice(0, 3).map((g) => el('span', { className: 'tag', textContent: g.nombre })))
                : null,
        ]),
    ]);
    card.addEventListener('click', () => mostrarDetalle(registro, tipo));
    return card;
}

function coincide(registro, texto) {
    if (!texto) return true;
    const campos = [
        registro.titulo,
        ...(registro.expand?.generos ?? []).map((g) => g.nombre),
        ...(registro.expand?.reparto ?? []).map((a) => a.nombre),
    ];
    return campos.some((c) => c.toLowerCase().includes(texto));
}

function pintar() {
    const texto = $('buscar').value.trim().toLowerCase();
    const peliculas = estado.peliculas.filter((r) => coincide(r, texto));
    const series = estado.series.filter((r) => coincide(r, texto));
    const verPeliculas = ['todo', 'peliculas'].includes(estado.filtro);
    const verSeries = ['todo', 'series'].includes(estado.filtro);

    $('gridPeliculas').replaceChildren(...peliculas.map((r) => tarjeta(r, 'peliculas')));
    $('gridSeries').replaceChildren(...series.map((r) => tarjeta(r, 'series')));
    $('seccionPeliculas').hidden = !verPeliculas || peliculas.length === 0;
    $('seccionSeries').hidden = !verSeries || series.length === 0;
    $('seccionGeneros').hidden = estado.filtro !== 'generos';
    $('vacio').hidden = estado.filtro === 'generos' || (verPeliculas && peliculas.length) || (verSeries && series.length);

    $('gridGeneros').replaceChildren(...estado.generos.map((g) => {
        const total = [...estado.peliculas, ...estado.series].filter((r) => r.generos.includes(g.id)).length;
        const card = el('button', { className: 'genre-card', type: 'button' }, [
            el('h3', { textContent: g.nombre }), el('p', { textContent: `${total} títulos` }),
        ]);
        card.addEventListener('click', () => {
            $('buscar').value = g.nombre;
            elegirFiltro('todo');
        });
        return card;
    }));
}

function elegirFiltro(filtro) {
    estado.filtro = filtro;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.filtro === filtro));
    pintar();
}

async function cargar() {
    $('cargando').hidden = false;
    try {
        const [peliculas, series, generos, actores] = await Promise.all([
            pb.collection('peliculas').getFullList({ sort: '-estreno', expand: 'generos,reparto' }),
            pb.collection('series').getFullList({ sort: '-estreno', expand: 'generos,reparto' }),
            pb.collection('generos').getFullList({ sort: 'nombre' }),
            pb.collection('actores').getFullList({ sort: 'nombre' }),
        ]);
        Object.assign(estado, { peliculas, series, generos, actores });
        llenarSelects();
        avisar('');
    } catch (error) {
        avisar('No se pudo cargar el catálogo. ¿Está corriendo PocketBase?');
    } finally {
        $('cargando').hidden = true;
        pintar();
    }
}

function mostrarDetalle(registro, tipo) {
    const generos = (registro.expand?.generos ?? []).map((g) => g.nombre).join(', ');
    const reparto = (registro.expand?.reparto ?? []).map((a) => a.nombre).join(', ');
    const contador = el('span', { className: 'stat-value', textContent: registro.descargas });
    const boton = el('button', { className: 'btn-primary', type: 'button', textContent: 'Descargar' });
    boton.addEventListener('click', async () => {
        boton.disabled = true;
        try {
            const r = await pb.send(`/api/descargas/${tipo}/${registro.id}`, { method: 'POST' });
            registro.descargas = r.descargas;
            contador.textContent = r.descargas;
            pintar();
        } catch {
            avisar('No se pudo registrar la descarga.');
        } finally {
            boton.disabled = false;
        }
    });
    const dato = (titulo, valor) => (valor ? el('p', {}, [el('strong', { textContent: `${titulo}: ` }), valor]) : null);
    $('detalle').replaceChildren(el('div', { className: 'detail-header' }, [
        el('div', { className: 'detail-poster' }, poster(registro, '500x750')),
        el('div', { className: 'detail-info' }, [
            el('h2', { textContent: registro.titulo }),
            dato('Estreno', fecha(registro.estreno)),
            tipo === 'series' ? dato('Temporadas', String(registro.temporadas)) : dato('Duración', registro.duracion_min ? `${registro.duracion_min} min` : ''),
            dato('Géneros', generos),
            dato('Reparto', reparto),
            dato('Premios', registro.premios),
            registro.sinopsis ? el('p', { textContent: registro.sinopsis }) : null,
            el('div', { className: 'detail-stats' }, el('div', { className: 'stat' }, [el('span', { className: 'stat-label', textContent: 'Descargas' }), contador])),
            boton,
        ]),
    ]));
    abrir('modalDetalle');
}

function llenarSelects() {
    const opciones = (lista) => lista.map((x) => el('option', { value: x.id, textContent: x.nombre }));
    document.querySelectorAll('.select-generos').forEach((s) => s.replaceChildren(...opciones(estado.generos)));
    document.querySelectorAll('.select-actores').forEach((s) => s.replaceChildren(...opciones(estado.actores)));
}

function abrir(id) { $(id).classList.add('active'); }
function cerrar(modal) { modal.classList.remove('active'); }

function actualizarBotonEditor() {
    $('botonEditor').textContent = pb.authStore.isValid ? 'Agregar' : 'Editor';
}

// Las reglas de PocketBase son las que protegen la escritura: sin sesión de
// editor, crear algo devuelve error aunque se salte esta pantalla.
$('botonEditor').addEventListener('click', () => abrir(pb.authStore.isValid ? 'modalAgregar' : 'modalLogin'));

$('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('errorLogin').textContent = '';
    try {
        await pb.collection('editores').authWithPassword($('loginEmail').value, $('loginClave').value);
        e.target.reset();
        cerrar($('modalLogin'));
        actualizarBotonEditor();
        abrir('modalAgregar');
    } catch {
        $('errorLogin').textContent = 'Correo o contraseña incorrectos.';
    }
});

document.querySelectorAll('.content-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        $('errorAgregar').textContent = '';
        const datos = new FormData(form);
        for (const campo of ['estreno', 'nacimiento']) {
            if (datos.get(campo)) datos.set(campo, `${datos.get(campo)} 00:00:00.000Z`);
        }
        if (!datos.get('poster')?.size) datos.delete('poster');
        try {
            await pb.collection(form.dataset.coleccion).create(datos);
            form.reset();
            cerrar($('modalAgregar'));
            await cargar();
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                pb.authStore.clear();
                actualizarBotonEditor();
            }
            const campos = Object.entries(error.response?.data ?? {}).map(([c, v]) => `${c}: ${v.message}`);
            $('errorAgregar').textContent = campos.length ? campos.join('; ') : 'No se pudo guardar.';
        }
    });
});

document.querySelectorAll('.tab-btn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.content-form').forEach((f) => f.classList.toggle('active', f.id === `form-${b.dataset.tab}`));
}));
document.querySelectorAll('.modal .close').forEach((x) => x.addEventListener('click', () => cerrar(x.closest('.modal'))));
window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) cerrar(e.target); });
document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => elegirFiltro(b.dataset.filtro)));
$('buscar').addEventListener('input', pintar);

actualizarBotonEditor();
cargar();
