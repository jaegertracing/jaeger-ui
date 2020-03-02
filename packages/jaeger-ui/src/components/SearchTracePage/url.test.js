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

import { getUrl, getUrlState, isSameQuery } from './url';

describe('SearchTracePage/url', () => {
  const span0 = 'span-0';
  const span1 = 'span-1';
  const span2 = 'span-2';
  const trace0 = 'trace-0';
  const trace1 = 'trace-1';
  const trace2 = 'trace-2';

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

    it('converts spanLink and traceID to traceID and span', () => {
      expect(
        getUrl({
          traceID: [trace0],
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
      ).toBe(`/search?span=${span0}%2C${span1}%40${trace0}&span=${span2}%40${trace1}&traceID=${trace2}`);
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
        getUrlState(`span=${span0}%2C${span1}%40${trace0}&span=${span2}%40${trace1}&traceID=${trace2}`)
      ).toEqual({
        traceID: expect.arrayContaining([trace0, trace1, trace2]),
        spanLinks: {
          [trace0]: `${span0} ${span1}`,
          [trace1]: span2,
        },
      });
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
    it('returns `false` if only one argument is falsy', () => {
      expect(isSameQuery({})).toBe(false);
    });
  });
});
