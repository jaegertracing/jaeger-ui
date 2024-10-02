FROM node:20.17.0

WORKDIR /workspace
COPY . .

RUN npm ci && cd ./packages/jaeger-ui && npm run build
