// Copyright (c) 2020 Uber Technologies, Inc.
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

import _get from 'lodash/get';
import _set from 'lodash/set';

import JaegerAPI from '../api/jaeger';

import * as getConfig from '../utils/config/get-config';
import { getDecoration as getDecorationImpl, stringSupplant } from './path-agnostic-decorations';

describe('getDecoration', () => {
  let getConfigValueSpy;
  let fetchDecorationSpy;
  let resolves;
  let rejects;
  // let mockDecorations;

  const opUrl = 'opUrl?service=#service&operation=#operation';
  const url = 'opUrl?service=#service';
  const valuePath = 'withoutOpPath.#service';
  const opValuePath = 'opPath.#service.#operation';
  const withOpID = 'decoration id with op url and op path';
  const partialID = 'decoration id with op url without op path';
  const withoutOpID = 'decoration id with only url';

  // wrapper is necessary to prevent cross pollution between tests
  let couldBePending = [];
  const getDecoration = (...args) => {
    const promise = getDecorationImpl(...args);
    if (promise) couldBePending.push(promise);
    return promise;
  };

  beforeAll(() => {
    getConfigValueSpy = jest
      .spyOn(getConfig, 'getConfigValue')
      .mockReturnValue([
        {
          id: withOpID,
          url,
          opUrl,
          valuePath,
          opValuePath,
        },
        {
          id: partialID,
          url,
          opUrl,
          valuePath,
        },{
          id: withoutOpID,
          url,
          valuePath,
        }
      ]);
    fetchDecorationSpy = jest
      .spyOn(JaegerAPI, 'fetchDecoration')
      .mockImplementation(() => new Promise((res, rej) => {
        resolves.push(res);
        rejects.push(rej);
      }));
  });

  beforeEach(() => {
    resolves = [];
    rejects = [];
    // mockDecorations = [];
  });

  afterEach(async () => {
    resolves.forEach(resolve => resolve());
    await Promise.all(couldBePending);
    couldBePending = [];
  });

  it('returns undefined if schema is not found for id', () => {
    expect(getDecoration('missing id', 'b', 'c')).toBeUndefined();
  });

  it('returns a promise for its first call', () => {
    expect(getDecoration(withOpID, 'b', 'c')).toEqual(expect.any(Promise));
  });

  it('returns undefined if invoked before previous invocation is resolved', () => {
    getDecoration(withOpID, 'b', 'c');
    expect(getDecoration(withoutOpID, 'b')).toBeUndefined();
  });

  it('resolves to include single response', async () => {
  });

  it('handles error responses', () => {
  });

  it('defaults value if valuePath not found in response', () => {
  });

  it('resolves to include responses for all concurrent requests', () => {
  });

  it('returns new promise if invoked after previous invocation is resolved', async () => {
    const promise = getDecoration(withOpID, 'b', 'c');
    resolves[0]();
    await promise;
    expect(getDecoration(withoutOpID, 'b')).toEqual(expect.any(Promise));
  });

  it('scopes promises to not include previous promise results', () => {
  });

  it('no-ops for already processed id, service, and operation', () => {
  });
});
