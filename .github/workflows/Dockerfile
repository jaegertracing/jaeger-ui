FROM node:20.15.1

WORKDIR /workspace
COPY . .

RUN  yarn install --frozen-lockfile && cd ./packages/jaeger-ui && yarn build
