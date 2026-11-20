FROM node:26.13.1@sha256:e18c3ccdf7d71619990b0e85639f506e2028a95410999cab24cc373cbd10e0ac

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
