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

import fetch from 'isomorphic-fetch';
import moment from 'moment';
import queryString from 'query-string';

import prefixUrl from '../utils/prefix-url';

function getJSON(url, query) {
  return fetch(`${url}${query ? `?${queryString.stringify(query)}` : ''}`, {
    credentials: 'include',
  }).then(response => {
    if (response.status >= 400) {
      if (response.status === 404) {
        throw new Error('Resource not found in the Jaeger Query Service.');
      }

      return response
        .json()
        .then(({ errors = [] }) => {
          throw new Error(errors.length > 0 ? errors[0].msg : 'An unknown error occurred.');
        })
        .catch(
          (/* err */) => {
            throw new Error('Bad JSON returned from the Jaeger Query Service.');
          }
        );
    }
    return response.json();
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');
export const DEFAULT_DEPENDENCY_LOOKBACK = moment.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
  fetchConfig() {
    return getJSON(`${this.apiRoot}config`).catch(err => ({ error: err }));
  },
  fetchTrace(id) {
    return getJSON(`${this.apiRoot}traces/${id}`);
  },
  searchTraces(query) {
    return getJSON(`${this.apiRoot}traces`, query);
  },
  fetchServices() {
    return getJSON(`${this.apiRoot}services`);
  },
  fetchServiceOperations(serviceName) {
    return getJSON(`${this.apiRoot}services/${serviceName}/operations`);
  },
  fetchDependencies(endTs = new Date().getTime(), lookback = DEFAULT_DEPENDENCY_LOOKBACK) {
    return getJSON(`${this.apiRoot}dependencies`, { endTs, lookback });
  },
};

/* istanbul ignore next */
function getMock(fnName, ...rest) {
  return new Promise(resolve => {
    require.ensure(['../demo/jaeger-mock'], require => {
      resolve(require('../demo/jaeger-mock').default[fnName](...rest));
    });
  });
}

/* istanbul ignore if */
if (process.env.REACT_APP_DEMO === 'true') {
  Object.keys(JaegerAPI).forEach(key => {
    if (typeof JaegerAPI[key] === 'function') {
      JaegerAPI[key] = (...args) => getMock(key, ...args);
    }
  });
}

export default JaegerAPI;
