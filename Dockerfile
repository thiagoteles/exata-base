# Production image. It builds with no secret, and every variable is read at runtime, so one image
# serves any environment. The one exception is Clerk's publishable key, which is public: in Clerk
# mode it is a build argument, because the prerendered pages carry Clerk's provider. Without it the
# image is for local sign-in.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm npm_config_store_dir=/pnpm/store COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1 CI=true LEFTHOOK=0
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /data/files && chown app:app /data/files
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# Files the browser fetches as they are. The standalone output does not include this folder.
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/lib/db/migrations ./lib/db/migrations
COPY --chown=app:app scripts/docker-entrypoint.sh ./docker-entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
