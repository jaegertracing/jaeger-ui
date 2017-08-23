// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import ReactDOM from 'react-dom';
import { document } from 'global';

import 'basscss/css/basscss.css';

import JaegerUIApp from './components/App';

/* istanbul ignore if */
if (process.env.NODE_ENV === 'development') {
  require.ensure(['global/window', 'react-addons-perf'], require => {
    const window = require('global/window');
    /* eslint-disable import/no-extraneous-dependencies */
    window.Perf = require('react-addons-perf');
    /* eslint-enable import/no-extraneous-dependencies */
  });
}

const UI_ROOT_ID = 'jaeger-ui-root';

/* istanbul ignore if */
if (document && process.env.NODE_ENV !== 'test') {
  ReactDOM.render(<JaegerUIApp />, document.getElementById(UI_ROOT_ID));
}
