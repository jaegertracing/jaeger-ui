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

import GraphModel from './index';
import { FOCAL_KEY } from './getPathElemHasher';
import transformDdgData from '../transformDdgData';
import { wrap } from '../sample-paths.test.resources';
import { EDdgDensity } from '../types';

describe('getPathElemHasher()', () => {
  function makePayloadEntry(pairStr) {
    const [service, operation] = pairStr.split(':');
    return { service, operation };
  }

  function makePayload(str) {
    return str
      .trim()
      .split('\n')
      .map(line =>
        line
          .trim()
          .split(/\s+/g)
          .map(makePayloadEntry)
      );
  }

  const payloadStr = `
    a:0   b:0   focal:focal   c:0   d:0
    a:0   c:0   focal:focal   d:0   c:0
          c:1   focal:focal   b:0   d:0
          c:0   focal:focal   b:0
    a:0   c:0   focal:focal   b:0
  `;
  const ddgModel = transformDdgData(wrap(makePayload(payloadStr)), makePayloadEntry('focal:focal'));

  describe('creates vertices based on density and showOp', () => {
    const testTable = [
      // showOp, density, number of expected vertices
      [false, EDdgDensity.MostConcise, 5],
      [true, EDdgDensity.MostConcise, 6],
      [false, EDdgDensity.UpstreamVsDownstream, 7],
      [true, EDdgDensity.UpstreamVsDownstream, 8],
      [false, EDdgDensity.OnePerLevel, 9],
      [true, EDdgDensity.OnePerLevel, 10],
      [false, EDdgDensity.PreventPathEntanglement, 11],
      [true, EDdgDensity.PreventPathEntanglement, 12],
      [false, EDdgDensity.ExternalVsInternal, 13],
      [true, EDdgDensity.ExternalVsInternal, 14],
    ];

    it.each(testTable)('showOp: %p \t density: %p', (showOp, density, verticesCount) => {
      const gm = new GraphModel({ ddgModel, density, showOp });
      expect(gm.vertices.size).toBe(verticesCount);
      expect(gm.vertices.has(FOCAL_KEY)).toBe(true);
    });
  });

  describe('EDdgDensity.MostConcise focal node edge cases', () => {
    const mcFocalStr = `
      focal:0  focal:0
      focal:0  focal:1
      focal:0  otherSvc:0
    `;
    const mcFocalModel = transformDdgData(wrap(makePayload(mcFocalStr)), makePayloadEntry('focal:0'));

    it('uses focal vertex for non-focal PathElem if its service equals the focal service and showOp is false', () => {
      const gm = new GraphModel({ ddgModel: mcFocalModel, density: EDdgDensity.MostConcise, showOp: false });
      expect(gm.vertices.size).toBe(2);
      expect(gm.vertices.has(FOCAL_KEY)).toBe(true);
    });

    it('uses focal vertex for non-focal PathElem if its service and operation equal the focal service and operation and showOp is true', () => {
      const gm = new GraphModel({ ddgModel: mcFocalModel, density: EDdgDensity.MostConcise, showOp: true });
      expect(gm.vertices.size).toBe(3);
      expect(gm.vertices.has(FOCAL_KEY)).toBe(true);
    });

    it('uses focal vertex for non-focal PathElem if its service equals the focal service and its operation is any of the focal operations and showOp is true and focal operation is not set', () => {
      const mcFocalWithCrossedOpStr = `${mcFocalStr}focal:1  focal:2`;
      const mcFocalWithCrossedOpModel = transformDdgData(
        wrap(makePayload(mcFocalWithCrossedOpStr)),
        makePayloadEntry('focal')
      );
      const gm = new GraphModel({
        ddgModel: mcFocalWithCrossedOpModel,
        density: EDdgDensity.MostConcise,
        showOp: true,
      });
      expect(gm.vertices.size).toBe(3);
      expect(gm.vertices.has(FOCAL_KEY)).toBe(true);
    });
  });

  it('throws error when not given supported density', () => {
    const invalidDensity = () =>
      new GraphModel({
        ddgModel,
        density: `${EDdgDensity.MostConcise} ${EDdgDensity.MostConcise}`,
        showOp: true,
      });
    expect(invalidDensity).toThrowError();

    const missingDensity = () => new GraphModel({ ddgModel, density: undefined, showOp: true });
    expect(missingDensity).toThrowError(/has not been implemented/);
  });
});
