# Build context must be the repo root (docker-compose sets context: .)
# so the workspace packages (packages/ui, packages/shared, apps/*) are available.
FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install
RUN pnpm --filter @ledgr/ui build
WORKDIR /app/apps/shell
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]
