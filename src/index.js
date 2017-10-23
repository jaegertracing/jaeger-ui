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

import React from 'react';
import ReactDOM from 'react-dom';
import { document } from 'global';

import 'basscss/css/basscss.css';

import JaegerUIApp from './components/App';
import { init as initTracking } from './utils/metrics';

/* istanbul ignore if */
if (process.env.NODE_ENV === 'development') {
  require.ensure(['global/window', 'react-addons-perf'], require => {
    const window = require('global/window');
    // eslint-disable-next-line import/no-extraneous-dependencies
    window.Perf = require('react-addons-perf');
  });
}

initTracking();

const UI_ROOT_ID = 'jaeger-ui-root';

/* istanbul ignore if */
if (document && process.env.NODE_ENV !== 'test') {
  ReactDOM.render(<JaegerUIApp />, document.getElementById(UI_ROOT_ID));
}
