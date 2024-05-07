FROM node:20.12.2

WORKDIR /workspace
COPY . .

RUN  yarn install --frozen-lockfile && cd ./packages/jaeger-ui && yarn build
