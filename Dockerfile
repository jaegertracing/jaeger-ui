# docker buildx build --progress plain --platform linux/s390x --tag pavolloffay/jaeger-ui:s390x --build-arg=TARGETARCH=s390x -f ./Dockerfile .
FROM node:18.19.0

WORKDIR /workspace
COPY . .

RUN  yarn install --frozen-lockfile && cd ./packages/jaeger-ui && yarn build
