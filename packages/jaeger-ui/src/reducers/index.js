// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { reducer as formReducer } from 'redux-form';

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
  form: formReducer,
};
