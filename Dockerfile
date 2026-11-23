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
EXPOSE 3000
CMD ["node", "server.js"]
