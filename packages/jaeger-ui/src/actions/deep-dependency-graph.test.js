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

import * as extractQuery from '../model/ddg/extractQuery';

import { extractMeta } from './deep-dependency-graph';

describe('deepDependencyGraph actions', () => {
  describe('extractMeta', () => {
    const service = 'serviceName';
    const operation = 'operationName';
    const start = '400';
    const end = '900';
    const expectedMeta = {
      service,
      operation,
      start: Number.parseInt(start, 10),
      end: Number.parseInt(end, 10),
    };
    let querySpy;

    beforeAll(() => {
      querySpy = jest.spyOn(extractQuery, 'default');
    });

    beforeEach(() => {
      querySpy.mockReset();
    });

    it('gets all values from extractQuery', () => {
      querySpy.mockReturnValue(expectedMeta);
      expect(extractMeta()).toEqual({
        query: expectedMeta,
      });
    });

    it('handles absent operation', () => {
      const { operation: _op, ...rest } = expectedMeta;
      querySpy.mockReturnValue(rest);
      expect(extractMeta()).toEqual({
        query: rest,
      });
    });

    it('errors on missing required values', () => {
      querySpy.mockReturnValue({
        operation,
        start,
        end,
      });
      expect(extractMeta).toThrowError(/Service name unavailable/);
      querySpy.mockReturnValue({
        service,
        operation,
        end,
      });
      expect(extractMeta).toThrowError(/Start time unavailable/);
      querySpy.mockReturnValue({
        service,
        operation,
        start,
      });
      expect(extractMeta).toThrowError(/End time unavailable/);
    });
  });
});
