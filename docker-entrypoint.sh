#!/bin/sh
set -e

# ------------------------------------------------------------------
#  Стартиране на ReMindBooks в контейнер.
#
#  Скриптът проверява конфигурацията, прилага миграциите и стартира сайта.
#
#  Диагностиката в началото е нарочно подробна: „Application failed to respond“
#  при хостинг доставчика не казва нищо, а причината почти винаги е липсваща
#  променлива. По-добре логът да го казва ясно, отколкото да се гадае.
# ------------------------------------------------------------------

PRISMA_CLI="${PRISMA_CLI_DIR:-/opt/prisma-cli}/node_modules/prisma/build/index.js"
SCHEMA="/app/prisma/schema.prisma"

echo "──────────────────────────────────────────────"
echo "  ReMindBooks — стартиране"
echo "──────────────────────────────────────────────"

# --- Проверка на конфигурацията -----------------------------------
# Показваме само дали стойността е зададена, никога самата стойност.
check() {
  if [ -n "$2" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ $1  — НЕ Е ЗАДАДЕНА"
  fi
}

echo "Конфигурация:"
check "DATABASE_URL" "$DATABASE_URL"
check "AUTH_SECRET" "$AUTH_SECRET"
check "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL"
check "STRIPE_SECRET_KEY (плащания)" "$STRIPE_SECRET_KEY"
check "S3_BUCKET (файлове)" "$S3_BUCKET"
check "RESEND_API_KEY (имейли)" "$RESEND_API_KEY"
echo "  · порт: ${PORT:-3000}"
echo ""

# DATABASE_URL няма да се появи от само себе си — няма смисъл да чакаме.
if [ -z "$DATABASE_URL" ]; then
  echo "✗ СПИРАНЕ: липсва DATABASE_URL."
  echo ""
  echo "  В Railway:"
  echo "   1. Проектът → + Create → Database → Add PostgreSQL"
  echo "   2. Услугата на приложението → Variables → + New Variable"
  echo "      → Add Reference → Postgres → DATABASE_URL"
  echo "   3. Redeploy"
  echo ""
  exit 1
fi

if [ -z "$AUTH_SECRET" ]; then
  echo "⚠ ВНИМАНИЕ: липсва AUTH_SECRET — сесиите не са защитени."
  echo "  Задайте я, преди сайтът да приема реални потребители."
  echo ""
fi

# --- Миграции ------------------------------------------------------
if [ ! -f "$PRISMA_CLI" ]; then
  echo "⚠ Prisma CLI не е намерен — миграциите се пропускат."
  exec "$@"
fi

echo "→ Прилагане на миграциите…"

ATTEMPTS=0
MAX=20
until node "$PRISMA_CLI" migrate deploy --schema "$SCHEMA" > /tmp/migrate.log 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX" ]; then
    echo "✗ Миграциите не успяха след $MAX опита. Грешка от Prisma:"
    echo "──────────────────────────────────────────────"
    cat /tmp/migrate.log
    echo "──────────────────────────────────────────────"
    echo "Най-чести причини: грешен DATABASE_URL или базата не приема връзки."
    exit 1
  fi
  echo "  … базата още не отговаря ($ATTEMPTS/$MAX)"
  sleep 3
done

echo "✓ Миграциите са приложени."
echo "→ Сайтът се стартира на порт ${PORT:-3000}…"
echo ""

exec "$@"
