#!/bin/sh
set -e

echo "Running Prisma migrations..."
# Roll back any previously-failed migrations so deploy can proceed
./node_modules/.bin/prisma migrate resolve --rolled-back 20260610000014_budget_responsable 2>/dev/null || true
./node_modules/.bin/prisma migrate resolve --rolled-back 20260610000015_ticket_ctf_models 2>/dev/null || true
./node_modules/.bin/prisma migrate resolve --rolled-back 20260610000016_ctf_challenges 2>/dev/null || true
./node_modules/.bin/prisma migrate resolve --rolled-back 20260610000017_ctf_fields 2>/dev/null || true
./node_modules/.bin/prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
