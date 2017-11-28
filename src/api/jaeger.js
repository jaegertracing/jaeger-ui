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
        .catch((/* err */) => {
          throw new Error('Bad JSON returned from the Jaeger Query Service.');
        });
    }
    return response.json();
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');
export const DEFAULT_DEPENDENCY_LOOKBACK = moment.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
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
