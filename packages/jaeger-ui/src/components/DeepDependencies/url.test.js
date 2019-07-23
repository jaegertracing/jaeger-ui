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
import * as reactRouterDom from 'react-router-dom';

import { ROUTE_PATH, matches, getUrl, getUrlState } from './url';

describe('DeepDependencyGraph/url', () => {
  describe('matches', () => {
    const path = 'path argument';
    let matchPathSpy;

    beforeAll(() => {
      matchPathSpy = jest.spyOn(reactRouterDom, 'matchPath');
    });

    it('calls matchPath with expected arguments', () => {
      matches(path);
      expect(matchPathSpy).toHaveBeenLastCalledWith(path, {
        path: ROUTE_PATH,
        strict: true,
        exact: true,
      });
    });

    it("returns truthiness of matchPath's return value", () => {
      matchPathSpy.mockReturnValueOnce(null);
      expect(matches(path)).toBe(false);
      matchPathSpy.mockReturnValueOnce({});
      expect(matches(path)).toBe(true);
    });
  });

  describe('getUrl', () => {
    it('handles no args given', () => {
      expect(getUrl()).toBe('/deep-dependencies');
    });

    it('handles empty args', () => {
      expect(getUrl({})).toBe('/deep-dependencies');
    });

    it('includes provided args', () => {
      const paramA = 'aParam';
      const paramB = 'bParam';
      expect(getUrl({ paramA, paramB })).toBe(`/deep-dependencies?paramA=${paramA}&paramB=${paramB}`);
    });
  });

  describe('getUrlState', () => {
    const search = 'test search';
    const service = 'serviceName';
    const operation = 'operationName';
    const start = '400';
    const end = '900';
    const visEncoding = 'vis encoding';
    const acceptableParams = {
      service,
      operation,
      start,
      end,
      visEncoding,
    };
    const expectedParams = {
      service,
      operation,
      start: Number.parseInt(start, 10),
      end: Number.parseInt(end, 10),
      visEncoding,
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
      expect(getUrlState(search)).toEqual(expectedParams);
      expect(parseSpy).toHaveBeenCalledWith(search);
    });

    it('handles absent values', () => {
      ['service', 'operation', 'start', 'end', 'visibilityEncoding'].forEach(param => {
        const { [param]: unused, ...rest } = expectedParams;
        const { [param]: alsoUnused, ...rv } = acceptableParams;
        parseSpy.mockReturnValue(rv);
        expect(getUrlState(search)).toEqual(rest);
        expect(parseSpy).toHaveBeenLastCalledWith(search);
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
      expect(getUrlState(search)).toEqual(expect.not.objectContaining(extraneous));
      expect(parseSpy).toHaveBeenCalledWith(search);
    });

    it('omits falsy values', () => {
      ['service', 'operation', 'start', 'end', 'visEncoding'].forEach(param => {
        [null, undefined, ''].forEach(falsyPossibility => {
          parseSpy.mockReturnValue({ ...expectedParams, [param]: falsyPossibility });
          expect(Reflect.has(getUrlState(search), param)).toBe(false);
          expect(parseSpy).toHaveBeenLastCalledWith(search);
        });
      });
    });

    it('handles and warns on duplicate values', () => {
      ['service', 'operation', 'start', 'end', 'visEncoding'].forEach(param => {
        const secondParam = `second ${acceptableParams[param]}`;
        parseSpy.mockReturnValue({
          ...acceptableParams,
          [param]: [acceptableParams[param], secondParam],
        });
        expect(getUrlState(search)[param]).toBe(expectedParams[param]);
        expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(secondParam));
        expect(parseSpy).toHaveBeenLastCalledWith(search);
      });
    });
  });
});
