// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Reducer } from 'redux';
import pathAgnosticDecorations from './path-agnostic-decorations';
import metrics from './metrics';
import trace from './trace';

const reducers: Record<string, Reducer<any, any>> = {
  pathAgnosticDecorations,
  metrics,
  trace,
};

export default reducers;
