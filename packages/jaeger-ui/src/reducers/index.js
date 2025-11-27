// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import config from './config';
import dependencies from './dependencies';
import ddg from './ddg';
import pathAgnosticDecorations from './path-agnostic-decorations';
import embedded from './embedded';
import services from './services';
import metrics from './metrics';
import trace from './trace';

export default {
  config,
  dependencies,
  ddg,
  embedded,
  pathAgnosticDecorations,
  services,
  metrics,
  trace,
};
