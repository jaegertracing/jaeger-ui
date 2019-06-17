// Copyright (c) 2019 Uber Technologies, Inc.
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

import queryString from 'query-string';

import extractQuery from './extractQuery';

describe('extractQuery', () => {
  const service = 'serviceName';
  const operation = 'operationName';
  const start = '400';
  const end = '900';
  const acceptableParams = {
    service,
    operation,
    start,
    end,
  };
  const expectedParams = {
    service,
    operation,
    start: Number.parseInt(start, 10),
    end: Number.parseInt(end, 10),
  };
  let warnSpy;
  let parseSpy;

  beforeAll(() => {
    parseSpy = jest.spyOn(queryString, 'parse');
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  beforeEach(() => {
    parseSpy.mockReset();
    warnSpy.mockReset();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('gets all values from queryString', () => {
    parseSpy.mockReturnValue(acceptableParams);
    expect(extractQuery()).toEqual(expectedParams);
  });

  it('handles absent values', () => {
    ['service', 'operation', 'start', 'end'].forEach(param => {
      const { [param]: unused, ...rest } = expectedParams;
      parseSpy.mockReturnValue(rest);
      expect(extractQuery()).toEqual(rest);
    });
  });

  it('ignores extraneous query parameters', () => {
    const extraneous = {
      param: 'value',
    };
    parseSpy.mockReturnValue({
      ...extraneous,
      ...acceptableParams,
    });
    expect(extractQuery()).toEqual(expect.not.objectContaining(extraneous));
  });

  it('omits falsy values', () => {
    ['service', 'operation', 'start', 'end'].forEach(param => {
      [null, undefined, ''].forEach(falsyPossibility => {
        parseSpy.mockReturnValue({ ...expectedParams, [param]: falsyPossibility });
        expect(Reflect.has(extractQuery(), param)).toBe(false);
      });
    });
  });

  it('handles and warns on duplicate values', () => {
    ['service', 'operation', 'start', 'end'].forEach(param => {
      const secondParam = `second ${acceptableParams[param]}`;
      parseSpy.mockReturnValue({
        ...acceptableParams,
        [param]: [acceptableParams[param], secondParam],
      });
      expect(extractQuery()[param]).toBe(expectedParams[param]);
      expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(secondParam));
    });
  });
});
