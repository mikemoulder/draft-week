# Build context is the repo root (see docker-compose.yml): the API bundles packages/shared.
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci -w @draftweek/api --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @draftweek/api

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci -w @draftweek/api --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/drizzle apps/api/drizzle
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
WORKDIR /repo/apps/api
USER node
EXPOSE 3940
CMD ["sh", "-c", "node dist/migrate.js && node dist/server.js"]
