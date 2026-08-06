# ------------------------------------------------------------------
#  ReMindBooks — production образ
#
#  Многоетапен build: финалният образ съдържа само компилираното
#  приложение, без изходен код и без dev зависимости (~200 MB вместо ~1.5 GB).
#
#  Използва се и локално (docker compose), и при деплой в Railway.
# ------------------------------------------------------------------

FROM node:20-alpine AS base
# Prisma и Next.js изискват тези библиотеки в Alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app


# --- 1. Зависимости -------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# `npm ci` спазва точните версии от lock файла — важно за възпроизводим build.
RUN npm ci


# --- 2. Компилация --------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js вгражда NEXT_PUBLIC_* променливите при компилация, затова се подават
# като build аргументи, а не само при стартиране.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG NEXT_PUBLIC_MEDIA_HOST=""
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_CONTACT_PHONE="+359 888 123 456"
ARG NEXT_PUBLIC_CONTACT_EMAIL="info@remindbooks.com"
ARG NEXT_PUBLIC_FACEBOOK_URL="https://facebook.com"
ARG NEXT_PUBLIC_TIKTOK_URL="https://tiktok.com"
ARG NEXT_PUBLIC_INSTAGRAM_URL=""

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MEDIA_HOST=$NEXT_PUBLIC_MEDIA_HOST \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CONTACT_PHONE=$NEXT_PUBLIC_CONTACT_PHONE \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_FACEBOOK_URL=$NEXT_PUBLIC_FACEBOOK_URL \
    NEXT_PUBLIC_TIKTOK_URL=$NEXT_PUBLIC_TIKTOK_URL \
    NEXT_PUBLIC_INSTAGRAM_URL=$NEXT_PUBLIC_INSTAGRAM_URL \
    NEXT_TELEMETRY_DISABLED=1

# Заместител само за компилацията — реалната стойност идва при стартиране.
# Next.js не се свързва с базата по време на build (всички страници са динамични).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AUTH_SECRET="build-time-only-placeholder-value-32ch"

RUN npx prisma generate
RUN npm run build


# --- 3. Изпълнение --------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Приложението не работи като root — ограничава щетите при пробив.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# `output: "standalone"` в next.config.ts събира само нужните файлове.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma схемата и миграциите са нужни за `migrate deploy` при стартиране.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI се инсталира в отделна папка, а не в /app/node_modules.
#
# Причината: CLI-ят разчита на транзитивни зависимости (`effect` и др.), които
# при hoisting лежат в корена на node_modules. Копирането само на папките
# `prisma/` и `@prisma/` оставя CLI-я счупен, а копирането на целия
# node_modules би обезсмислило standalone build-а (стотици мегабайти).
# Изолираната инсталация решава и двата проблема.
#
# Почистването на npm кеша е в СЪЩИЯ RUN слой. Отделен слой не помага —
# Docker слоевете са адитивни и вече записаните файлове остават в образа.
ENV PRISMA_CLI_DIR=/opt/prisma-cli
RUN mkdir -p $PRISMA_CLI_DIR \
 && cd $PRISMA_CLI_DIR \
 && npm init -y > /dev/null \
 && npm install prisma@6.19.3 --omit=dev --no-audit --no-fund > /dev/null \
 && npm cache clean --force \
 && rm -rf /root/.npm /tmp/* \
 # За миграции е нужен само schema-engine за текущата платформа.
 # Query engine-ите се използват от клиента в /app, не от CLI-я.
 && find $PRISMA_CLI_DIR -name "libquery_engine*" -delete \
 && find $PRISMA_CLI_DIR -name "query-engine*" -delete \
 && chown -R nextjs:nodejs $PRISMA_CLI_DIR

# Папка за качени файлове в локален режим (без S3/R2).
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
