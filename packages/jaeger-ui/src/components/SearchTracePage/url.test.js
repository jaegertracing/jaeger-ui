// Copyright (c) 2020 The Jaeger Authors.
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

import * as reactRouterDom from 'react-router-dom';

import { MAX_LENGTH } from '../DeepDependencies/Graph/DdgNodeContent/constants';
import { ROUTE_PATH, getUrl, getUrlState, isSameQuery, matches } from './url';

jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
}));

describe('SearchTracePage/url', () => {
  const span0 = 'span-0';
  const span1 = 'span-1';
  const span2 = 'span-2';
  const trace0 = 'trace-0';
  const trace1 = 'trace-1';
  const trace2 = 'trace-2';

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
      expect(getUrl()).toBe('/search');
    });

    it('handles empty args', () => {
      expect(getUrl({})).toBe('/search?');
    });

    it('includes provided args', () => {
      const paramA = 'aParam';
      const paramB = 'bParam';
      expect(getUrl({ paramA, paramB })).toBe(`/search?paramA=${paramA}&paramB=${paramB}`);
    });

    it('preserves traceID without spanLinks', () => {
      expect(
        getUrl({
          traceID: trace0,
        })
      ).toBe(`/search?traceID=${trace0}`);
    });

    it('converts spanLink and its traceID to just span', () => {
      expect(
        getUrl({
          traceID: trace0,
          spanLinks: {
            [trace0]: span0,
          },
        })
      ).toBe(`/search?span=${span0}%40${trace0}`);
    });

    it('handles missing traceID for spanLinks', () => {
      expect(
        getUrl({
          spanLinks: {
            [trace0]: span0,
          },
        })
      ).toBe(`/search?span=${span0}%40${trace0}`);
    });

    it('handles empty spanLinks', () => {
      expect(
        getUrl({
          spanLinks: {},
        })
      ).toBe(`/search?`);
    });

    it('converts spanLink and other traceID to traceID and span', () => {
      expect(
        getUrl({
          traceID: [trace0, trace2],
          spanLinks: {
            [trace0]: span0,
          },
        })
      ).toBe(`/search?span=${span0}%40${trace0}&traceID=${trace2}`);
    });

    it('converts spanLinks to traceID and span', () => {
      expect(
        getUrl({
          traceID: [trace0, trace1, trace2],
          spanLinks: {
            [trace0]: `${span0} ${span1}`,
            [trace1]: span2,
          },
        })
      ).toBe(`/search?span=${span0}%20${span1}%40${trace0}&span=${span2}%40${trace1}&traceID=${trace2}`);
    });

    describe('too long urls', () => {
      const oneID = getUrl({
        traceID: trace0,
      });
      const lengthBeforeArgs = oneID.indexOf('?');
      const lengthOfOneArg = oneID.length - lengthBeforeArgs;
      const maxLengthOfArgs = MAX_LENGTH - lengthBeforeArgs;

      it('limits url length', () => {
        const numberOfArgs = Math.ceil(maxLengthOfArgs / lengthOfOneArg);

        expect(
          getUrl({
            traceID: new Array(numberOfArgs).fill(trace0),
          }).length
        ).toBeLessThan(MAX_LENGTH);
      });

      it('does not over shorten', () => {
        const numberOfArgs = Math.floor(maxLengthOfArgs / lengthOfOneArg);
        const remainder = maxLengthOfArgs % lengthOfOneArg;
        const ids = new Array(numberOfArgs).fill(trace0);
        ids[ids.length - 1] = `${ids[ids.length - 1]}${'x'.repeat(remainder)}`;
        ids.push(trace0);

        expect(
          getUrl({
            traceID: ids,
          }).length
        ).toBe(MAX_LENGTH);
      });
    });
  });

  describe('getUrlState', () => {
    it('gets search params', () => {
      const service = 'svc-0';
      const operation = 'op-0';
      expect(getUrlState(`service=${service}&operation=${operation}`)).toEqual({ service, operation });
    });

    it('converts span to traceID and spanLinks', () => {
      expect(getUrlState(`span=${span0}%40${trace0}`)).toEqual({
        traceID: [trace0],
        spanLinks: {
          [trace0]: span0,
        },
      });
    });

    it('converts multiple spans to traceID and spanLinks', () => {
      expect(
        getUrlState(`span=${span0}%20${span1}%40${trace0}&span=${span2}%40${trace1}&traceID=${trace2}`)
      ).toEqual({
        traceID: expect.arrayContaining([trace0, trace1, trace2]),
        spanLinks: {
          [trace0]: `${span0} ${span1}`,
          [trace1]: span2,
        },
      });
    });

    it('converts span param without spanIDs to just traceID', () => {
      expect(getUrlState(`span=${span0}%20${span1}%40${trace0}&span=%40${trace1}&traceID=${trace2}`)).toEqual(
        {
          traceID: expect.arrayContaining([trace0, trace1, trace2]),
          spanLinks: {
            [trace0]: `${span0} ${span1}`,
          },
        }
      );
    });

    it('handles duplicate traceIDs', () => {
      expect(
        getUrlState(
          `span=${span0}%40${trace0}&span=${span1}%40${trace0}&span=${span2}%40${trace1}&traceID=${trace1}&traceID=${trace2}`
        )
      ).toEqual({
        traceID: expect.arrayContaining([trace0, trace1, trace2]),
        spanLinks: {
          [trace0]: `${span0} ${span1}`,
          [trace1]: span2,
        },
      });
    });
  });

  describe('isSameQuery', () => {
    const queryKeys = [
      'end',
      'limit',
      'lookback',
      'maxDuration',
      'minDuration',
      'operation',
      'service',
      'start',
      'tags',
    ];
    const otherKey = 'other-key';
    const baseQuery = queryKeys.reduce(
      (res, curr, i) => ({
        ...res,
        [curr]: i % 2 ? curr : i,
      }),
      { [otherKey]: otherKey }
    );

    it('returns `false` if only one argument is falsy', () => {
      expect(isSameQuery(baseQuery)).toBe(false);
    });

    it('returns `false` if a considered key is changed or omitted', () => {
      queryKeys.forEach(key => {
        const { [key]: _omitted, ...rest } = baseQuery;
        expect(isSameQuery(baseQuery, rest)).toBe(false);
        expect(isSameQuery(baseQuery, { ...rest, [key]: 'changed' })).toBe(false);
      });
    });

    it('returns `true` if no considered keys are changed or omitted', () => {
      expect(isSameQuery(baseQuery, { ...baseQuery })).toBe(true);

      const { [otherKey]: _omitted, ...copy } = baseQuery;
      expect(isSameQuery(baseQuery, copy)).toBe(true);
      expect(isSameQuery(baseQuery, { ...copy, [otherKey]: 'changed' })).toBe(true);
    });
  });
});
