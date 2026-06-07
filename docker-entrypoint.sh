#!/bin/sh
set -e

echo "Running Prisma migrations..."
# Resolve any previously failed migrations so deploy can proceed
./node_modules/.bin/prisma migrate resolve --rolled-back 20260610000017_ctf_fields 2>/dev/null || true
./node_modules/.bin/prisma migrate deploy

# PDFKit AFM fonts are not copied by Next.js standalone tracing — patch the expected path
AFM_SRC="./node_modules/pdfkit/js/data"
AFM_DST=".next/server/chunks/data"
if [ -d "$AFM_SRC" ] && [ ! -f "$AFM_DST/Helvetica.afm" ]; then
  echo "Copying PDFKit AFM fonts to standalone bundle..."
  mkdir -p "$AFM_DST"
  cp "$AFM_SRC"/*.afm "$AFM_DST"/
fi

echo "Starting Next.js..."
exec node server.js
