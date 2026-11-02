FROM node:26.12.0@sha256:45a2bf9d9300e9cf47ecb375e38447c140c45ef5fbae869c430475b05b98d86e

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
