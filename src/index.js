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

/* eslint-disable import/first */

import React from 'react';
import ReactDOM from 'react-dom';
import { document } from 'global';

import JaegerUIApp from './components/App';
import { init as initTracking } from './utils/metrics';

import 'u-basscss/css/flexbox.css';
import 'u-basscss/css/layout.css';
import 'u-basscss/css/margin.css';
import 'u-basscss/css/position.css';
import 'u-basscss/css/typography.css';

initTracking();

const UI_ROOT_ID = 'jaeger-ui-root';

/* istanbul ignore if */
if (document && process.env.NODE_ENV !== 'test') {
  ReactDOM.render(<JaegerUIApp />, document.getElementById(UI_ROOT_ID));
}
