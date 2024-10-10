FROM node:20.18.0

WORKDIR /workspace

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY packages/jaeger-ui/package.json packages/jaeger-ui/package.json
COPY packages/plexus/package.json packages/plexus/package.json
RUN npm ci

COPY . .
RUN npm run build
