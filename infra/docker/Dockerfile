# Node and package manager are pinned independently from the machine's tools.
ARG BROWSER_BASE_IMAGE=node:24.18.0-bookworm-slim
FROM node:24.18.0-bookworm-slim AS dependencies
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY twenty-app/package.json twenty-app/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN chmod -R a+rX /app /opt/corepack
RUN DATABASE_URL=postgresql://unused:unused@127.0.0.1:5432/unused pnpm db:generate

FROM dependencies AS web-build
RUN NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @revenue/web build
FROM node:24.18.0-bookworm-slim AS web
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3100
WORKDIR /app
COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

FROM ${BROWSER_BASE_IMAGE} AS browser
USER root
# An optional local browser image can reuse already downloaded OS packages.
RUN if ! command -v chromium >/dev/null; then apt-get update && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-extra ca-certificates && rm -rf /var/lib/apt/lists/*; fi
FROM browser AS service
ENV COREPACK_HOME=/opt/corepack
WORKDIR /app
COPY --from=dependencies /opt/corepack /opt/corepack
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=dependencies /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc /app/tsconfig.base.json /app/.node-version /app/LICENSE /app/THIRD_PARTY_NOTICES.md ./
COPY --from=dependencies /app/apps/api /app/apps/api
COPY --from=dependencies /app/apps/worker /app/apps/worker
COPY --from=dependencies /app/packages/backend /app/packages/backend
COPY --from=dependencies /app/packages/contracts /app/packages/contracts
COPY --from=dependencies /app/packages/database /app/packages/database
COPY --from=dependencies /app/scripts/migrate-and-seed.mjs /app/scripts/migrate-and-seed.mjs
RUN corepack enable
RUN printf '\nverifyDepsBeforeRun: false\n' >> pnpm-workspace.yaml
# Cache and verify the migration engine for the final image's OpenSSL platform.
# Runtime schema migration must not download binaries into root-owned node_modules.
RUN DATABASE_URL=postgresql://unused:unused@127.0.0.1:5432/unused pnpm --filter @revenue/database exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /dev/null
ENV NODE_ENV=production API_HOST=0.0.0.0 CHROME_PATH=/usr/bin/chromium
RUN mkdir -p /app/.local/assets /app/.local/vault && chown -R node:node /app/.local
USER node
FROM service AS api
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4100/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@revenue/api", "start"]
FROM service AS worker
EXPOSE 4101
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4101/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@revenue/worker", "start"]
