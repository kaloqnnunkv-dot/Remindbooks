#!/bin/sh
set -e

# ------------------------------------------------------------------
#  Стартиране на ReMindBooks в контейнер.
#
#  Прилага миграциите по базата, преди приложението да тръгне. Изчаква базата,
#  защото при `docker compose up` двата контейнера стартират едновременно.
#
#  Prisma CLI живее в отделна папка (виж Dockerfile) — production образът няма
#  пълен node_modules, за да остане малък.
# ------------------------------------------------------------------

PRISMA_CLI="${PRISMA_CLI_DIR:-/opt/prisma-cli}/node_modules/prisma/build/index.js"
SCHEMA="/app/prisma/schema.prisma"

run_migrations() {
  node "$PRISMA_CLI" migrate deploy --schema "$SCHEMA"
}

if [ ! -f "$PRISMA_CLI" ]; then
  echo "⚠ Prisma CLI не е намерен — миграциите се пропускат."
  echo "  Приложението ще работи само ако базата вече е мигрирана."
  exec "$@"
fi

echo "→ Прилагане на миграциите…"

ATTEMPTS=0
until run_migrations > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "✗ Миграциите не успяха след 30 опита. Пълната грешка:"
    run_migrations
    exit 1
  fi
  echo "  … изчакване на базата ($ATTEMPTS/30)"
  sleep 2
done

echo "✓ Базата е готова."
echo "→ Стартиране на приложението на порт ${PORT:-3000}…"

exec "$@"
