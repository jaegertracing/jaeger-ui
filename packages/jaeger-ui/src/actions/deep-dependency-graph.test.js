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

import queryString from 'query-string';

import { extractMeta } from './deep-dependency-graph';

describe('deepDependencyGraph actions', () => {
  describe('extractMeta', () => {
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
    const expectedMeta = {
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
      expect(extractMeta()).toEqual({
        query: expectedMeta,
      });
    });

    it('handles absent operation', () => {
      parseSpy.mockReturnValue({
        service,
        start,
        end,
      });
      expect(extractMeta()).toEqual({
        query: {
          service,
          operation: undefined,
          start: Number.parseInt(start, 10),
          end: Number.parseInt(end, 10),
        },
      });
    });

    it('errors on missing required values', () => {
      parseSpy.mockReturnValue({
        operation,
        start,
        end,
      });
      expect(extractMeta).toThrowError(/Service name unavailable/);
      parseSpy.mockReturnValue({
        service,
        operation,
        end,
      });
      expect(extractMeta).toThrowError(/Start time unavailable/);
      parseSpy.mockReturnValue({
        service,
        operation,
        start,
      });
      expect(extractMeta).toThrowError(/End time unavailable/);
    });

    it('ignores extraneous query parameters', () => {
      const extraneous = {
        param: 'value',
      };
      parseSpy.mockReturnValue({
        ...extraneous,
        ...acceptableParams,
      });
      expect(extractMeta()).toEqual(expect.not.objectContaining(extraneous));
    });

    it('handles and warns on duplicate values', () => {
      ['service', 'operation', 'start', 'end'].forEach(param => {
        const secondParam = `second ${acceptableParams[param]}`;
        parseSpy.mockReturnValue({
          ...acceptableParams,
          [param]: [acceptableParams[param], secondParam],
        });
        expect(extractMeta().query[param]).toBe(expectedMeta[param]);
        expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(secondParam));
      });
    });
  });
});
