/// <reference path="../pb_data/types.d.ts" />
// Catálogo de ejemplo y, si EDITOR_EMAIL y EDITOR_PASSWORD están definidos,
// una cuenta de editor para probar el panel.
migrate((app) => {
  const crear = (coleccion, datos) => {
    const r = new Record(app.findCollectionByNameOrId(coleccion), datos);
    app.save(r);
    return r.id;
  };

  const g = {};
  for (const n of ["Drama", "Comedia", "Fantasía", "Animación", "Suspenso", "Crimen", "Ciencia ficción", "Historia"]) {
    g[n] = crear("generos", { nombre: n });
  }
  const a = {};
  for (const [n, pais, nac] of [
    ["Ivana Baquero", "España", "2004-06-11"],
    ["Sergi López", "España", "1965-12-22"],
    ["Ricardo Darín", "Argentina", "1957-01-16"],
    ["Yalitza Aparicio", "México", "1993-12-11"],
    ["Wagner Moura", "Brasil", "1976-06-27"],
    ["Louis Hofmann", "Alemania", "1997-06-03"],
    ["Jared Harris", "Reino Unido", "1961-08-24"],
    ["Lee Jung-jae", "Corea del Sur", "1972-12-15"],
  ]) {
    a[n] = crear("actores", { nombre: n, pais: pais, nacimiento: nac + " 00:00:00.000Z" });
  }

  const peliculas = [
    ["El laberinto del fauno", "2006-10-11", 119, "3 premios Óscar", ["Fantasía", "Drama"], ["Ivana Baquero", "Sergi López"]],
    ["Relatos salvajes", "2014-08-21", 122, "Nominada al Óscar a mejor película extranjera", ["Comedia", "Drama"], ["Ricardo Darín"]],
    ["El secreto de sus ojos", "2009-08-13", 129, "Óscar a mejor película extranjera", ["Drama", "Suspenso"], ["Ricardo Darín"]],
    ["Roma", "2018-08-30", 135, "3 premios Óscar", ["Drama"], ["Yalitza Aparicio"]],
    ["Coco", "2017-10-27", 105, "2 premios Óscar", ["Animación", "Comedia"], []],
  ];
  for (const [titulo, estreno, min, premios, gs, rep] of peliculas) {
    crear("peliculas", {
      titulo: titulo, estreno: estreno + " 00:00:00.000Z", duracion_min: min, premios: premios, descargas: 0,
      generos: gs.map((n) => g[n]), reparto: rep.map((n) => a[n]),
    });
  }

  const series = [
    ["Narcos", "2015-08-28", 3, "", ["Crimen", "Drama"], ["Wagner Moura"]],
    ["Dark", "2017-12-01", 3, "", ["Ciencia ficción", "Suspenso"], ["Louis Hofmann"]],
    ["Chernóbil", "2019-05-06", 1, "10 premios Emmy", ["Drama", "Historia"], ["Jared Harris"]],
    ["El juego del calamar", "2021-09-17", 3, "", ["Suspenso", "Drama"], ["Lee Jung-jae"]],
  ];
  for (const [titulo, estreno, temporadas, premios, gs, rep] of series) {
    crear("series", {
      titulo: titulo, estreno: estreno + " 00:00:00.000Z", temporadas: temporadas, premios: premios, descargas: 0,
      generos: gs.map((n) => g[n]), reparto: rep.map((n) => a[n]),
    });
  }

  const email = $os.getenv("EDITOR_EMAIL");
  const clave = $os.getenv("EDITOR_PASSWORD");
  if (email && clave) {
    const editor = new Record(app.findCollectionByNameOrId("editores"));
    editor.setEmail(email);
    editor.setPassword(clave);
    editor.set("nombre", "Editor");
    app.save(editor);
  }
}, (app) => {
  for (const c of ["series", "peliculas", "actores", "generos", "editores"]) {
    app.db().newQuery(`DELETE FROM ${c}`).execute();
  }
});
