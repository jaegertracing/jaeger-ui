// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export default function getEdgeId(from: string, to: string) {
  return `${from}\v${to}`;
}
