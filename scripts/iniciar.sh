#!/bin/sh
# Crea (o actualiza) el superusuario y un editor si vienen en el entorno, y arranca PocketBase.
set -e
./pocketbase migrate up --dir /pb/pb_data
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  ./pocketbase superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir /pb/pb_data
fi
exec ./pocketbase serve --http 0.0.0.0:8090 --dir /pb/pb_data
