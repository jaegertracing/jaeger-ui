FROM node:24.18.0

WORKDIR /workspace
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY packages/jaeger-ui/package.json packages/jaeger-ui/package.json
COPY packages/plexus/package.json packages/plexus/package.json
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build
