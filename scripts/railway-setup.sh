#!/usr/bin/env bash
#
# Задава всички променливи на средата в Railway с една команда.
#
# Ръчното въвеждане на 25 променливи през уеб интерфейса е бавно и лесно
# се допускат грешки (интервал в края, объркан ключ). Този скрипт ги задава
# накуп и извежда кои още липсват.
#
# Употреба:
#   1. npm i -g @railway/cli
#   2. railway login          ← отваря браузър, еднократно
#   3. railway link           ← избира проекта Remindbooks
#   4. cp scripts/railway-env.example scripts/railway-env
#   5. попълнете scripts/railway-env с реалните ключове
#   6. bash scripts/railway-setup.sh
#
# ВАЖНО: scripts/railway-env съдържа тайни и е в .gitignore. Не го качвайте.

set -euo pipefail

ENV_FILE="$(dirname "$0")/railway-env"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Липсва $ENV_FILE"
  echo "  Копирайте scripts/railway-env.example и попълнете стойностите."
  exit 1
fi

if ! command -v railway > /dev/null 2>&1; then
  echo "✗ Railway CLI не е инсталиран.  npm i -g @railway/cli"
  exit 1
fi

echo "→ Задаване на променливите в Railway…"

MISSING=""
COUNT=0

while IFS= read -r line || [ -n "$line" ]; do
  # Пропускаме коментари и празни редове
  case "$line" in
    ''|'#'*) continue ;;
  esac

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Празна стойност = още не е налична; отбелязваме и продължаваме.
  if [ -z "$VALUE" ]; then
    MISSING="$MISSING $KEY"
    continue
  fi

  railway variables --set "$KEY=$VALUE" > /dev/null
  echo "  ✓ $KEY"
  COUNT=$((COUNT + 1))
done < "$ENV_FILE"

echo ""
echo "✓ Зададени $COUNT променливи."

if [ -n "$MISSING" ]; then
  echo ""
  echo "⚠ Все още липсват (попълнете ги, когато ги получите):"
  for k in $MISSING; do echo "   - $k"; done
fi

echo ""
echo "Следваща стъпка:  railway up"
