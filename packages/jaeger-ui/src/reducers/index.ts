// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Reducer } from 'redux';
import dependencies from './dependencies';
import ddg from './ddg';
import pathAgnosticDecorations from './path-agnostic-decorations';
import metrics from './metrics';
import trace from './trace';

const reducers: Record<string, Reducer<any, any>> = {
  dependencies,
  ddg,
  pathAgnosticDecorations,
  metrics,
  trace,
};

export default reducers;
