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

// export for tests
export function getMessageFromError(errData, status) {
  if (errData.code != null && errData.msg != null) {
    if (errData.code === status) {
      return errData.msg;
    }
    return `${errData.code} - ${errData.msg}`;
  }
  try {
    return JSON.stringify(errData);
  } catch (_) {
    return String(errData);
  }
}

function getJSON(url, options = {}) {
  const { query = null, ...init } = options;
  init.credentials = 'same-origin';
  const queryStr = query ? `?${queryString.stringify(query)}` : '';
  return fetch(`${url}${queryStr}`, init).then(response => {
    if (response.status < 400) {
      return response.json();
    }
    return response.text().then(bodyText => {
      let data;
      let bodyTextFmt;
      let errorMessage;
      try {
        data = JSON.parse(bodyText);
        bodyTextFmt = JSON.stringify(data, null, 2);
      } catch (_) {
        data = null;
        bodyTextFmt = null;
      }
      if (data && Array.isArray(data.errors) && data.errors.length) {
        errorMessage = data.errors.map(err => getMessageFromError(err, response.status)).join('; ');
      } else {
        errorMessage = bodyText || `${response.status} - ${response.statusText}`;
      }
      if (typeof errorMessage === 'string') {
        errorMessage = errorMessage.trim();
      }
      const error = new Error(`HTTP Error: ${errorMessage}`);
      error.httpStatus = response.status;
      error.httpStatusText = response.statusText;
      error.httpBody = bodyTextFmt || bodyText;
      error.httpUrl = url;
      error.httpQuery = typeof query === 'string' ? query : queryString.stringify(query);
      throw error;
    });
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');
export const ANALYTICS_ROOT = prefixUrl('/analytics/');
export const DEFAULT_DEPENDENCY_LOOKBACK = moment.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
  archiveTrace(id) {
    return getJSON(`${this.apiRoot}archive/${id}`, { method: 'POST' });
  },
  fetchQualityMetrics(service /* , lookback = DEFAULT_QUALITY_METRICS_LOOKBACK */) {
    return getJSON(`/qualitymetrics-v2`, { query: { service /* , lookback */ } });
  },
  fetchDecoration(url) {
    console.log('calling url: ', url);
    return getJSON(url);
    // eslint-disable-next-line no-unreachable
    if (url.startsWith('/analytics') || url.startsWith('/api/serviceedges')) {
      return getJSON(url);
    }
    if (url.length % 2 && url.startsWith('neapolitan')) {
      return new Promise((res, rej) =>
        setTimeout(() => {
          if (url.length % 4 === 1) res('No val here');
          else rej(new Error(`One of the unlucky quarter: ${url.length}`));
        }, 150)
      );
    }
    // eslint-disable-next-line no-unreachable
    if (url === 'get graph') {
      return new Promise(res =>
        setTimeout(
          () =>
            res({
              deets: {
                here: [
                  {
                    count: {
                      value: 0,
                      styling: {
                        backgroundColor: 'red',
                        color: 'white',
                      },
                    },
                    value: 'first',
                    foo: 'bar',
                    bar: 'baz',
                  },
                  {
                    count: 1,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 2,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 3,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 4,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 5,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 6,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 7,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 8,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 9,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 10,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 11,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 12,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 13,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 14,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 15,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 16,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 17,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 18,
                    value: 'third',
                    foo: 'bar three',
                  },
                  {
                    count: 19,
                    value: 'second',
                    foo: 'bar too',
                  },
                  {
                    count: 20,
                    value: 'third',
                    foo: 'bar three',
                  },
                ],
              },
              defs: {
                here: [
                  'count',
                  {
                    key: 'value',
                    label: 'The value column',
                    styling: {
                      backgroundColor: 'blue',
                      color: 'lightgrey',
                    },
                  },
                  'foo',
                ],
              },
            }),
          2750
        )
      );
    }
    // eslint-disable-next-line no-unreachable
    if (url === 'get string') {
      return new Promise(res =>
        setTimeout(
          () =>
            res({
              deets: {
                here:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
              },
            }),
          750
        )
      );
    }
    // eslint-disable-next-line no-unreachable
    if (url === 'get list') {
      return new Promise(res =>
        setTimeout(
          () =>
            res({
              deets: {
                here: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'.split(
                  ' '
                ),
              },
            }),
          750
        )
      );
    }
    // eslint-disable-next-line no-unreachable
    if (url === 'infinite load')
      return new Promise(res => setTimeout(() => res('you are patient, eh?'), 1500000));
    // eslint-disable-next-line no-unreachable
    if (url === 'deets err')
      return new Promise((res, rej) => setTimeout(() => rej(new Error('you knew this would happen')), 600));
    // eslint-disable-next-line no-unreachable
    if (url === 'deets 404') return new Promise(res => res({}));
    // eslint-disable-next-line no-unreachable
    return new Promise(res => setTimeout(() => res({ val: url.length ** 2 }), 150));
    // return getJSON(url);
  },
  fetchDeepDependencyGraph(query) {
    return getJSON(`${ANALYTICS_ROOT}v1/dependencies`, { query });
  },
  fetchDependencies(endTs = new Date().getTime(), lookback = DEFAULT_DEPENDENCY_LOOKBACK) {
    return getJSON(`${this.apiRoot}dependencies`, { query: { endTs, lookback } });
  },
  fetchServiceOperations(serviceName) {
    return getJSON(`${this.apiRoot}services/${encodeURIComponent(serviceName)}/operations`);
  },
  fetchServiceServerOps(service) {
    return getJSON(`${this.apiRoot}operations`, {
      query: {
        service,
        spanKind: 'server',
      },
    });
  },
  fetchServices() {
    return getJSON(`${this.apiRoot}services`);
  },
  fetchTrace(id) {
    return getJSON(`${this.apiRoot}traces/${id}`);
  },
  searchTraces(query) {
    return getJSON(`${this.apiRoot}traces`, { query });
  },
};

export default JaegerAPI;
