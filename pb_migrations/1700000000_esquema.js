/// <reference path="../pb_data/types.d.ts" />
// Esquema de StreamFlix. Leer es público; crear, editar y borrar solo lo
// pueden hacer las cuentas de la colección "editores".
const SOLO_EDITORES = '@request.auth.collectionName = "editores"';
// En películas y series, además, el contador de descargas no se escribe a mano.
const EDITORES_SIN_DESCARGAS = SOLO_EDITORES + ' && @request.body.descargas:isset = false';

migrate((app) => {
  const editores = new Collection({
    type: "auth",
    name: "editores",
    // Las cuentas de editor las crea un superusuario desde el panel.
    createRule: null,
    listRule: "id = @request.auth.id",
    viewRule: "id = @request.auth.id",
    fields: [{ name: "nombre", type: "text", max: 80 }],
  });
  app.save(editores);

  const generos = new Collection({
    type: "base",
    name: "generos",
    listRule: "",
    viewRule: "",
    createRule: SOLO_EDITORES,
    updateRule: SOLO_EDITORES,
    deleteRule: SOLO_EDITORES,
    fields: [{ name: "nombre", type: "text", required: true, max: 40 }],
    indexes: ["CREATE UNIQUE INDEX idx_generos_nombre ON generos (nombre COLLATE NOCASE)"],
  });
  app.save(generos);

  const actores = new Collection({
    type: "base",
    name: "actores",
    listRule: "",
    viewRule: "",
    createRule: SOLO_EDITORES,
    updateRule: SOLO_EDITORES,
    deleteRule: SOLO_EDITORES,
    fields: [
      { name: "nombre", type: "text", required: true, max: 80 },
      { name: "pais", type: "text", max: 60 },
      { name: "nacimiento", type: "date" },
    ],
  });
  app.save(actores);

  const comunes = () => [
    { name: "titulo", type: "text", required: true, max: 120 },
    { name: "estreno", type: "date", required: true },
    { name: "sinopsis", type: "text", max: 600 },
    { name: "premios", type: "text", max: 200 },
    // Solo cambia por /api/descargas (ver pb_hooks): nadie lo escribe a mano.
    { name: "descargas", type: "number", min: 0, onlyInt: true },
    {
      name: "poster", type: "file", maxSelect: 1, maxSize: 5 * 1024 * 1024,
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    { name: "reparto", type: "relation", collectionId: actores.id, maxSelect: 20 },
    { name: "generos", type: "relation", collectionId: generos.id, maxSelect: 5 },
    { name: "creado", type: "autodate", onCreate: true },
  ];

  app.save(new Collection({
    type: "base",
    name: "peliculas",
    listRule: "",
    viewRule: "",
    createRule: EDITORES_SIN_DESCARGAS,
    updateRule: EDITORES_SIN_DESCARGAS,
    deleteRule: SOLO_EDITORES,
    fields: [...comunes(), { name: "duracion_min", type: "number", min: 1, max: 600, onlyInt: true }],
  }));

  app.save(new Collection({
    type: "base",
    name: "series",
    listRule: "",
    viewRule: "",
    createRule: EDITORES_SIN_DESCARGAS,
    updateRule: EDITORES_SIN_DESCARGAS,
    deleteRule: SOLO_EDITORES,
    fields: [...comunes(), { name: "temporadas", type: "number", required: true, min: 1, max: 60, onlyInt: true }],
  }));
}, (app) => {
  for (const nombre of ["series", "peliculas", "actores", "generos", "editores"]) {
    app.delete(app.findCollectionByNameOrId(nombre));
  }
});
