FROM node:24.22.0@sha256:925de64a85319052d6971ae81ef2417da956e8a3a2c4a0fac732327970f017f5

WORKDIR /workspace

# Let corepack provision the pnpm version pinned in package.json without prompting
# for a download in the non-interactive build.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY packages/jaeger-ui/package.json packages/jaeger-ui/package.json
COPY packages/plexus/package.json packages/plexus/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm run build
