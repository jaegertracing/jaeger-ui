# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

FROM golang:1.27.0@sha256:4013ae0f9e7994f8535c58c811f8f863fbed38b72e0d51e6592156f758d66146 AS build
WORKDIR /src
RUN git clone --depth 1 --branch v2.21.0 https://github.com/jaegertracing/jaeger.git . \
    && test "$(git rev-parse HEAD)" = aceb434cb586ecefe13706707279d49ec4b94fa2
COPY main.go cmd/parity-fixture/main.go
RUN CGO_ENABLED=0 go build -o /converter ./cmd/parity-fixture

FROM scratch
COPY --from=build /converter /converter
ENTRYPOINT ["/converter"]
