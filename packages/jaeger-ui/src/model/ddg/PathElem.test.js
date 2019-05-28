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

import PathElem from './PathElem';
import { simplePath } from './sample-paths.test.resources';

describe('PathElem', () => {
  const testMemberIdx = 3;
  const testOperation = {};
  const testPath = {
    focalIdx: 5,
    members: ['member0', 'member1', 'member2', 'member3', 'member4', 'member5'],
  };
  const testVisibilityIdx = 105;
  let pathElem;

  beforeEach(() => {
    pathElem = new PathElem({ path: testPath, operation: testOperation, memberIdx: testMemberIdx });
  });

  it('initializes instance properties', () => {
    expect(pathElem.memberIdx).toBe(testMemberIdx);
    expect(pathElem.memberOf).toBe(testPath);
    expect(pathElem.operation).toBe(testOperation);
  });

  it('calculates distance', () => {
    expect(pathElem.distance).toBe(-2);
  });

  it('sets visibilityIdx', () => {
    pathElem.visibilityIdx = testVisibilityIdx;
    expect(pathElem.visibilityIdx).toBe(testVisibilityIdx);
  });

  it('errors when trying to access unset visibilityIdx', () => {
    expect(() => pathElem.visibilityIdx).toThrowError();
  });

  it('errors when trying to override visibilityIdx', () => {
    pathElem.visibilityIdx = testVisibilityIdx;
    expect(() => {
      pathElem.visibilityIdx = testVisibilityIdx;
    }).toThrowError();
  });

  it('has focalSideNeighbor if distance is not 0', () => {
    expect(pathElem.focalSideNeighbor).toBe(testPath.members[testMemberIdx + 1]);
  });

  it('has a null focalSideNeighbor if distance is 0', () => {
    pathElem = new PathElem({ path: testPath, operation: testOperation, memberIdx: testPath.focalIdx });
    expect(pathElem.focalSideNeighbor).toBe(null);
  });

  it('has correct farSideEdgesKey and focalSideEdgesKey when upstream', () => {
    expect(pathElem.farSideEdgesKey).toBe('ingressEdges');
    expect(pathElem.focalSideEdgesKey).toBe('egressEdges');
  });

  it('has correct farSideEdgesKey and focalSideEdgesKey when downstream', () => {
    pathElem = new PathElem({ path: testPath, operation: testOperation, memberIdx: testPath.focalIdx + 1 });
    expect(pathElem.farSideEdgesKey).toBe('egressEdges');
    expect(pathElem.focalSideEdgesKey).toBe('ingressEdges');
  });

  describe('legibility', () => {
    const operations = simplePath.map(({ operation, service }) => ({
      name: operation,
      service: {
        name: service,
      },
    }));
    const path = {
      focalIdx: 2,
    };
    const members = operations.map((operation, i) => new PathElem({ memberIdx: i, operation, path }));
    members[2].visibilityIdx = 0;
    members[3].visibilityIdx = 1;
    members[1].visibilityIdx = 2;
    members[4].visibilityIdx = 3;
    members[0].visibilityIdx = 4;
    path.members = members;
    const targetPathElem = path.members[1];

    it('creates consumable JSON', () => {
      expect(targetPathElem.toJSON()).toMatchSnapshot();
    });

    it('creates consumable string', () => {
      expect(targetPathElem.toString()).toBe(JSON.stringify(targetPathElem.toJSON(), null, 2));
    });

    it('creates informative string tag', () => {
      expect(Object.prototype.toString.call(targetPathElem)).toEqual(
        `[object PathElem ${targetPathElem.visibilityIdx}]`
      );
    });
  });
});
