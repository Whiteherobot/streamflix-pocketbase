/// <reference path="../pb_data/types.d.ts" />
// POST /api/descargas/{coleccion}/{id}: suma una descarga.
// El incremento se hace en una sola sentencia SQL, así dos descargas al mismo
// tiempo no se pisan (antes el navegador leía el valor y escribía valor + 1).
routerAdd("POST", "/api/descargas/{coleccion}/{id}", (e) => {
  const coleccion = e.request.pathValue("coleccion");
  const id = e.request.pathValue("id");
  if (coleccion !== "peliculas" && coleccion !== "series") {
    throw new NotFoundError("Colección inexistente");
  }
  const resultado = e.app.db()
    .newQuery(`UPDATE ${coleccion} SET descargas = descargas + 1 WHERE id = {:id}`)
    .bind({ id: id })
    .execute();
  if (resultado.rowsAffected() === 0) {
    throw new NotFoundError("No existe ese título");
  }
  const registro = e.app.findRecordById(coleccion, id);
  return e.json(200, { id: id, descargas: registro.getInt("descargas") });
});
