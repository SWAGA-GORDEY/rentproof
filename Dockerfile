FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Baked into client/metadata at build time. Override via Render env / docker --build-arg.
ARG NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV RENTPROOF_DB_PATH=/data/rentproof.sqlite
ENV RENTPROOF_UPLOAD_DIR=/data/uploads
# Do NOT mkdir /data here. Render must mount the persistent disk at /data.
# Creating /data in the image masks a missing disk and previously led to
# EACCES (mkdir '/data') or ephemeral writes. App creates only /data/uploads
# after verifying the mount exists.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Postgres sync worker + CJS runtime (loaded via createRequire, not bundled).
COPY --from=build /app/src/lib/pg-sync-worker.mjs ./pg-sync-worker.mjs
COPY --from=build /app/src/lib/pg-database-runtime.cjs ./pg-database-runtime.cjs
COPY --from=build /app/node_modules/pg ./node_modules/pg
COPY --from=build /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=build /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=build /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=build /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=build /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=build /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=build /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=build /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=build /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=build /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=build /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=build /app/node_modules/split2 ./node_modules/split2
COPY --from=build /app/node_modules/xtend ./node_modules/xtend
ENV RENTPROOF_PG_WORKER=/app/pg-sync-worker.mjs
EXPOSE 3000
CMD ["node", "server.js"]
