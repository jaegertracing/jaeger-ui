// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

type TNonEmptyArray<T> = [T, ...T[]];

export default TNonEmptyArray;
