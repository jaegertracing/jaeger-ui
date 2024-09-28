FROM node:20.17.0

WORKDIR /workspace
COPY . .

RUN  yarn install --frozen-lockfile && cd ./packages/jaeger-ui && yarn build
