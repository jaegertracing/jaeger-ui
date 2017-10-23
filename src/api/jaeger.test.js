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

import traceGenerator from '../demo/trace-generators';
import JaegerAPI from './jaeger';

const generatedTraces = traceGenerator.traces({ traces: 5 });
jest.mock('isomorphic-fetch', () =>
  jest.fn(() =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
  )
);

const fetchMock = require('isomorphic-fetch');

it('fetchTrace() should fetch with the id', () => {
  fetchMock.mockClear();
  JaegerAPI.apiRoot = '/api/';
  JaegerAPI.fetchTrace('trace-id');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/traces/trace-id');
});

it('fetchTrace() should resolve the whole response', () => {
  fetchMock.mockReturnValue(
    Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ data: generatedTraces }),
    })
  );

  return JaegerAPI.fetchTrace('trace-id').then(resp => expect(resp.data).toBe(generatedTraces));
});

it('fetchTrace() should reject with a bad status code', () => {
  fetchMock.mockReturnValue(
    Promise.resolve({
      status: 400,
      json: () => Promise.resolve({ data: null }),
    })
  );

  JaegerAPI.fetchTrace('trace-id').then(
    () => new Error(),
    err => {
      expect(err instanceof Error).toBeTruthy();
    }
  );
});
