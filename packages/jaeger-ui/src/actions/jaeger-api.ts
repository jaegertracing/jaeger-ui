// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAction } from 'redux-actions';
import JaegerAPI from '../api/jaeger';

export const fetchTrace = createAction(
  '@JAEGER_API/FETCH_TRACE',
  (id: string) => JaegerAPI.fetchTrace(id),
  (id: string) => ({ id })
);

export const archiveTrace = createAction(
  '@JAEGER_API/ARCHIVE_TRACE',
  (id: string) => JaegerAPI.archiveTrace(id),
  (id: string) => ({ id })
);

export const fetchDeepDependencyGraph = createAction(
  '@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH',
  (query: Record<string, any>) => JaegerAPI.fetchDeepDependencyGraph(query),
  (query: Record<string, any>) => ({ query })
);

export const fetchDependencies = createAction('@JAEGER_API/FETCH_DEPENDENCIES', () =>
  JaegerAPI.fetchDependencies()
);
