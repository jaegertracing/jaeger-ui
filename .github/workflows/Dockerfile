FROM node:24.17.0

RUN corepack enable pnpm

WORKDIR /workspace

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY .npmrc .npmrc
COPY packages/jaeger-ui/package.json packages/jaeger-ui/package.json
COPY packages/plexus/package.json packages/plexus/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
