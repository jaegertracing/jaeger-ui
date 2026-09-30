// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Reducer } from 'redux';
import pathAgnosticDecorations from './path-agnostic-decorations';

const reducers: Record<string, Reducer<any, any>> = {
  pathAgnosticDecorations,
};

export default reducers;
