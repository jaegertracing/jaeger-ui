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

import _set from 'lodash/set';

import { _processed, getDecoration as getDecorationImpl } from './path-agnostic-decorations';
import * as getConfig from '../utils/config/get-config';
import stringSupplant from '../utils/stringSupplant';
import JaegerAPI from '../api/jaeger';

jest.mock('lru-memoize', () => () => x => x);

describe('getDecoration', () => {
  let getConfigValueSpy;
  let fetchDecorationSpy;
  let resolves;
  let rejects;

  const opSummaryUrl = 'opSummaryUrl?service=#service&operation=#operation';
  const summaryUrl = 'summaryUrl?service=#service';
  const summaryPath = 'withoutOpPath.#service';
  const opSummaryPath = 'opPath.#service.#operation';
  const withOpID = 'decoration id with op url and op path';
  const partialID = 'decoration id with op url without op path';
  const withoutOpID = 'decoration id with only url';
  const service = 'svc';
  const operation = 'op';
  const testVal = 42;

  // wrapper is necessary to prevent cross pollution between tests
  let couldBePending = [];
  const getDecoration = (...args) => {
    const promise = getDecorationImpl(...args);
    if (promise) couldBePending.push(promise);
    return promise;
  };

  beforeAll(() => {
    getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue').mockReturnValue([
      {
        id: withOpID,
        summaryUrl,
        opSummaryUrl,
        summaryPath,
        opSummaryPath,
      },
      {
        id: partialID,
        summaryUrl,
        opSummaryUrl,
        summaryPath,
      },
      {
        id: withoutOpID,
        summaryUrl,
        summaryPath,
      },
    ]);
    fetchDecorationSpy = jest.spyOn(JaegerAPI, 'fetchDecoration').mockImplementation(
      () =>
        new Promise((res, rej) => {
          resolves.push(res);
          rejects.push(rej);
        })
    );
  });

  beforeEach(() => {
    fetchDecorationSpy.mockClear();
    _processed.clear();
    resolves = [];
    rejects = [];
  });

  afterEach(async () => {
    resolves.forEach(resolve => resolve());
    await Promise.all(couldBePending);
    couldBePending = [];
  });

  it('returns undefined if no schemas exist in config', () => {
    getConfigValueSpy.mockReturnValueOnce();
    expect(getDecoration('foo', service, operation)).toBeUndefined();
  });

  it('returns undefined if schema is not found for id', () => {
    expect(getDecoration('missing id', service, operation)).toBeUndefined();
  });

  it('returns a promise for its first call', () => {
    expect(getDecoration(withOpID, service, operation)).toEqual(expect.any(Promise));
  });

  it('resolves to include single response for op decoration given op', async () => {
    const promise = getDecoration(withOpID, service, operation);
    resolves[0](_set({}, stringSupplant(opSummaryPath, { service, operation }), testVal));
    const res = await promise;
    expect(res).toEqual(_set({}, `${withOpID}.withOp.${service}.${operation}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(opSummaryUrl, { service, operation }));
  });

  it('resolves to include single response for op decoration not given op', async () => {
    const promise = getDecoration(withOpID, service);
    resolves[0](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res = await promise;
    expect(res).toEqual(_set({}, `${withOpID}.withoutOp.${service}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));
  });

  it('resolves to include single response for malformed op decoration given op', async () => {
    const promise = getDecoration(partialID, service, operation);
    resolves[0](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res = await promise;
    expect(res).toEqual(_set({}, `${partialID}.withoutOp.${service}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));
  });

  it('resolves to include single response for svc decoration given op', async () => {
    const promise = getDecoration(withoutOpID, service, operation);
    resolves[0](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res = await promise;
    expect(res).toEqual(_set({}, `${withoutOpID}.withoutOp.${service}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));
  });

  it('resolves to include single response for svc decoration not given op', async () => {
    const promise = getDecoration(withoutOpID, service);
    resolves[0](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res = await promise;
    expect(res).toEqual(_set({}, `${withoutOpID}.withoutOp.${service}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));
  });

  it('handles error responses', async () => {
    const message = 'foo error message';
    const promise0 = getDecoration(withoutOpID, service);
    rejects[0]({ message });
    const res0 = await promise0;
    expect(res0).toEqual(
      _set({}, `${withoutOpID}.withoutOp.${service}`, `Unable to fetch decoration: ${message}`)
    );
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));

    const err = 'foo error without message';
    const promise1 = getDecoration(withOpID, service, operation);
    rejects[1](err);
    const res1 = await promise1;
    expect(res1).toEqual(
      _set({}, `${withOpID}.withOp.${service}.${operation}`, `Unable to fetch decoration: ${err}`)
    );
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(opSummaryUrl, { service, operation }));
  });

  it('defaults value if summaryPath not found in response', async () => {
    const promise = getDecoration(withoutOpID, service);
    resolves[0]();
    const res = await promise;
    expect(res).toEqual(
      _set(
        {},
        `${withoutOpID}.withoutOp.${service}`,
        `\`${stringSupplant(summaryPath, { service })}\` not found in response`
      )
    );
    expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(summaryUrl, { service }));
  });

  it('returns undefined if invoked before previous invocation is resolved', () => {
    getDecoration(withOpID, service, operation);
    expect(getDecoration(withoutOpID, service)).toBeUndefined();
  });

  it('resolves to include responses for all concurrent requests', async () => {
    const otherOp = 'other op';
    const promise = getDecoration(withOpID, service, operation);
    resolves[0](_set({}, stringSupplant(opSummaryPath, { service, operation }), testVal));
    getDecoration(partialID, service, operation);
    resolves[1](_set({}, stringSupplant(summaryPath, { service }), testVal));
    getDecoration(withOpID, service);
    resolves[2](_set({}, stringSupplant(summaryPath, { service }), testVal));
    getDecoration(withoutOpID, service);
    resolves[3](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const message = 'foo error message';
    getDecoration(withOpID, service, otherOp);
    rejects[4]({ message });
    const res = await promise;

    expect(res).toEqual({
      [withOpID]: {
        withOp: {
          [service]: {
            [operation]: testVal,
            [otherOp]: `Unable to fetch decoration: ${message}`,
          },
        },
        withoutOp: {
          [service]: testVal,
        },
      },
      [partialID]: {
        withoutOp: {
          [service]: testVal,
        },
      },
      [withoutOpID]: {
        withoutOp: {
          [service]: testVal,
        },
      },
    });
  });

  it('scopes promises to not include previous promise results', async () => {
    const otherOp = 'other op';
    const promise0 = getDecoration(withOpID, service, operation);
    resolves[0](_set({}, stringSupplant(opSummaryPath, { service, operation }), testVal));
    getDecoration(partialID, service, operation);
    resolves[1](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res0 = await promise0;

    const promise1 = getDecoration(withOpID, service);
    resolves[2](_set({}, stringSupplant(summaryPath, { service }), testVal));
    getDecoration(withoutOpID, service);
    resolves[3](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const message = 'foo error message';
    getDecoration(withOpID, service, otherOp);
    rejects[4]({ message });
    const res1 = await promise1;

    expect(res0).toEqual({
      [withOpID]: {
        withOp: {
          [service]: {
            [operation]: testVal,
          },
        },
      },
      [partialID]: {
        withoutOp: {
          [service]: testVal,
        },
      },
    });

    expect(res1).toEqual({
      [withOpID]: {
        withOp: {
          [service]: {
            [otherOp]: `Unable to fetch decoration: ${message}`,
          },
        },
        withoutOp: {
          [service]: testVal,
        },
      },
      [withoutOpID]: {
        withoutOp: {
          [service]: testVal,
        },
      },
    });
  });

  it('no-ops for already processed id, service, and operation', async () => {
    const promise0 = getDecoration(withOpID, service, operation);
    resolves[0](_set({}, stringSupplant(opSummaryPath, { service, operation }), testVal));
    const res0 = await promise0;
    expect(res0).toEqual(_set({}, `${withOpID}.withOp.${service}.${operation}`, testVal));

    const promise1 = getDecoration(withOpID, service, operation);
    expect(promise1).toBeUndefined();

    const promise2 = getDecoration(withoutOpID, service);
    resolves[1](_set({}, stringSupplant(summaryPath, { service }), testVal));
    const res1 = await promise2;
    expect(res1).toEqual(_set({}, `${withoutOpID}.withoutOp.${service}`, testVal));
    expect(fetchDecorationSpy).toHaveBeenCalledTimes(2);
  });
});
