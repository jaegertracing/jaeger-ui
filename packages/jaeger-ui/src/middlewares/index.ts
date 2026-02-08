// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import promiseMiddleware from 'redux-promise-middleware';

export { default as trackMiddleware } from './track';

export const promise = promiseMiddleware;
