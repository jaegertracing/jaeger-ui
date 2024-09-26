FROM node:20.17.0

WORKDIR /workspace
COPY . .

RUN  yarn install --immutable && cd ./packages/jaeger-ui && yarn build
