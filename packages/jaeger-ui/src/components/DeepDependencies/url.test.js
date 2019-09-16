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

import { ROUTE_PATH, matches, getUrl, getUrlParams } from './url';

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

    it('includes safe form of provided service', () => {
      const service = 'service/name';
      expect(getUrl({ service })).toBe(`/deep-dependencies/${encodeURIComponent(service)}?`);
    });

    it('includes safe form of provided service and operation', () => {
      const service = 'service/name';
      const operation = 'operation::name';
      expect(getUrl({ operation, service })).toBe(
        `/deep-dependencies/${encodeURIComponent(service)}/${encodeURIComponent(operation)}?`
      );
    });

    it('converts truthiness of showOp into 0 or 1', () => {
      expect(getUrl({ showOp: true })).toBe(`/deep-dependencies?showOp=1`);
      expect(getUrl({ showOp: false })).toBe(`/deep-dependencies?showOp=0`);
    });
  });

  describe('getUrlParams', () => {
    const search = 'test search';
    const density = 'test density';
    const end = '900';
    const showOp = '0';
    const start = '400';
    const visEncoding = 'vis encoding';
    const acceptableParams = {
      density,
      end,
      showOp,
      start,
      visEncoding,
    };
    const expectedParams = {
      density,
      end: Number.parseInt(end, 10),
      showOp: Boolean(+showOp),
      start: Number.parseInt(start, 10),
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
      expect(getUrlParams(search)).toEqual(expectedParams);
      expect(parseSpy).toHaveBeenCalledWith(search);
    });

    it('handles absent values', () => {
      ['end', 'start', 'visEncoding'].forEach(param => {
        const { [param]: unused, ...rest } = expectedParams;
        const { [param]: alsoUnused, ...rv } = acceptableParams;
        parseSpy.mockReturnValue(rv);
        expect(getUrlParams(search)).toEqual(rest);
        expect(parseSpy).toHaveBeenLastCalledWith(search);
      });
    });

    it('defaults `showOp` to true', () => {
      const { showOp: unused, ...rest } = expectedParams;
      const { showOp: alsoUnused, ...rv } = acceptableParams;
      parseSpy.mockReturnValue(rv);
      expect(getUrlParams(search)).toEqual({ ...rest, showOp: true });
      expect(parseSpy).toHaveBeenLastCalledWith(search);
    });

    it("defaults `density` to 'ppe'", () => {
      const { density: unused, ...rest } = expectedParams;
      const { density: alsoUnused, ...rv } = acceptableParams;
      parseSpy.mockReturnValue(rv);
      expect(getUrlParams(search)).toEqual({ ...rest, density: 'ppe' });
      expect(parseSpy).toHaveBeenLastCalledWith(search);
    });

    it('ignores extraneous query parameters', () => {
      const extraneous = {
        param: 'value',
      };
      parseSpy.mockReturnValue({
        ...extraneous,
        ...acceptableParams,
      });
      expect(getUrlParams(search)).toEqual(expect.not.objectContaining(extraneous));
      expect(parseSpy).toHaveBeenCalledWith(search);
    });

    it('omits falsy values', () => {
      ['end', 'start', 'visEncoding'].forEach(param => {
        [null, undefined, ''].forEach(falsyPossibility => {
          parseSpy.mockReturnValue({ ...expectedParams, [param]: falsyPossibility });
          expect(Reflect.has(getUrlParams(search), param)).toBe(false);
          expect(parseSpy).toHaveBeenLastCalledWith(search);
        });
      });
    });

    it('handles and warns on duplicate values', () => {
      ['end', 'showOp', 'start', 'visEncoding'].forEach(param => {
        const secondParam = `second ${acceptableParams[param]}`;
        parseSpy.mockReturnValue({
          ...acceptableParams,
          [param]: [acceptableParams[param], secondParam],
        });
        expect(getUrlParams(search)[param]).toBe(expectedParams[param]);
        expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(secondParam));
        expect(parseSpy).toHaveBeenLastCalledWith(search);
      });
    });
  });
});
