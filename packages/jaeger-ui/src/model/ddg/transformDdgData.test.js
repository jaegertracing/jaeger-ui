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

import _filter from 'lodash/filter';
import _flatten from 'lodash/flatten';
import _map from 'lodash/map';

import transformDdgData from './transformDdgData';
import * as testResources from './sample-paths.test.resources';

describe('transform ddg data', () => {
  function outputValidator({ paths: payload, focalIndices, ignoreFocalOperation = false }) {
    const { focalPayloadElem } = testResources;
    const focalPayloadElemArgument = ignoreFocalOperation
      ? { service: focalPayloadElem.service }
      : focalPayloadElem;
    const { paths, services, visIdxToPathElem } = transformDdgData(
      payload.map(testResources.wrap),
      focalPayloadElemArgument
    );

    // Validate all services and operations are captured
    expect(new Set(services.keys())).toEqual(new Set(_map(_flatten(payload), 'service')));
    services.forEach((service, serviceName) => {
      expect(new Set(service.operations.keys())).toEqual(
        new Set(_map(_filter(_flatten(payload), { service: serviceName }), 'operation'))
      );
    });

    const expectedVisIndices = [];
    const visIndicesToDistance = new Map();

    // Validate every pathElem has the correct data
    paths.forEach((path, pathResultIndex) => {
      expect(path.focalIdx).toBe(focalIndices[pathResultIndex]);
      path.members.forEach((member, memberResultIndex) => {
        const { distance, memberOf, operation, memberIdx, visibilityIdx } = member;
        expect(distance).toBe(memberIdx - focalIndices[pathResultIndex]);
        expect(memberOf).toBe(path);
        expect(operation.name).toBe(payload[pathResultIndex][memberResultIndex].operation);
        expect(operation.pathElems.includes(member)).toBe(true);
        expect(operation.service.name).toBe(payload[pathResultIndex][memberResultIndex].service);
        expect(memberIdx).toBe(memberResultIndex);

        expectedVisIndices.push(expectedVisIndices.length);
        visIndicesToDistance.set(visibilityIdx, distance);
      });
    });

    // Validate that visibility indices are concentric
    const orderedVisIndices = Array.from(visIndicesToDistance.keys()).sort((a, b) => a - b);
    expect(orderedVisIndices).toEqual(expectedVisIndices);
    let distance = 0;
    orderedVisIndices.forEach(orderedIdx => {
      const currentDistance = Math.abs(visIndicesToDistance.get(orderedIdx));
      if (currentDistance < distance) {
        throw new Error('Net distance did not increase or stay equal as visibilityIdx increased');
      } else if (currentDistance > distance) {
        distance = currentDistance;
      }

      expect(visIdxToPathElem[orderedIdx].visibilityIdx).toBe(orderedIdx);
    });
  }

  it('transforms an extremely simple payload', () => {
    const { simplePath } = testResources;
    outputValidator({ paths: [simplePath], focalIndices: [2] });
  });

  it('transforms a path with multiple operations per service and multiple services per operation', () => {
    const { longSimplePath } = testResources;
    outputValidator({ paths: [longSimplePath], focalIndices: [6] });
  });

  it('transforms a path that contains the focal path elem twice', () => {
    const { doubleFocalPath } = testResources;
    outputValidator({ paths: [doubleFocalPath], focalIndices: [2] });
  });

  it('checks both operation and service when calculating focalIdx when both are provided', () => {
    const { almostDoubleFocalPath } = testResources;
    outputValidator({ paths: [almostDoubleFocalPath], focalIndices: [4] });
  });

  it('checks only service when calculating focalIdx when only service is provided', () => {
    const { almostDoubleFocalPath } = testResources;
    outputValidator({ paths: [almostDoubleFocalPath], focalIndices: [2], ignoreFocalOperation: true });
  });

  it('transforms a payload with significant overlap between paths', () => {
    const { simplePath, longSimplePath, doubleFocalPath, almostDoubleFocalPath } = testResources;
    outputValidator({
      paths: [simplePath, doubleFocalPath, almostDoubleFocalPath, longSimplePath],
      focalIndices: [2, 2, 4, 6],
    });
  });

  it('handles duplicate paths', () => {
    const { simplePath } = testResources;
    outputValidator({
      paths: [simplePath, simplePath],
      focalIndices: [2, 2],
    });
  });

  it('sorts payload paths to ensure stable visibilityIndices', () => {
    const {
      focalPayloadElem,
      simplePath,
      longSimplePath,
      doubleFocalPath,
      almostDoubleFocalPath,
    } = testResources;
    const { visIdxToPathElem: presortedPathsVisIdxToPathElem } = transformDdgData(
      [simplePath, doubleFocalPath, almostDoubleFocalPath, longSimplePath].map(testResources.wrap),
      focalPayloadElem
    );
    const { visIdxToPathElem: unsortedPathsVisIdxToPathElem } = transformDdgData(
      [longSimplePath, almostDoubleFocalPath, simplePath, doubleFocalPath].map(testResources.wrap),
      focalPayloadElem
    );

    expect(_map(presortedPathsVisIdxToPathElem, 'visibilityIdx')).toEqual(
      _map(unsortedPathsVisIdxToPathElem, 'visibilityIdx')
    );
    presortedPathsVisIdxToPathElem.forEach((presortedPathsPathElem, presortedPathsVisIdx) => {
      const {
        memberIdx: presortedPathsMemberIdx,
        memberOf: presortedPathsMemberOf,
        operation: presortedPathsOperation,
      } = presortedPathsPathElem;
      const { focalIdx: presortedPathsFocalIdx } = presortedPathsMemberOf;
      const { name: presortedPathsOperationName, service: presortedService } = presortedPathsOperation;
      const { name: presortedPathsServiceName } = presortedService;

      const {
        memberIdx: unsortedPathsMemberIdx,
        memberOf: unsortedPathsMemberOf,
        operation: unsortedPathsOperation,
        visibilityIdx: unsortedPathsVisIdx,
      } = unsortedPathsVisIdxToPathElem[presortedPathsVisIdx];
      const { focalIdx: unsortedPathsFocalIdx } = unsortedPathsMemberOf;
      const { name: unsortedPathsOperationName, service: unsortedService } = unsortedPathsOperation;
      const { name: unsortedPathsServiceName } = unsortedService;

      expect(unsortedPathsMemberIdx).toBe(presortedPathsMemberIdx);
      expect(unsortedPathsFocalIdx).toBe(presortedPathsFocalIdx);
      expect(unsortedPathsOperationName).toBe(presortedPathsOperationName);
      expect(unsortedPathsServiceName).toBe(presortedPathsServiceName);
      expect(unsortedPathsVisIdx).toBe(presortedPathsVisIdx);
    });
  });

  it('throws an error if a path lacks the focalPayloadElem', () => {
    const { simplePath, noFocalPath, doubleFocalPath, focalPayloadElem } = testResources;
    expect(() =>
      transformDdgData([simplePath, noFocalPath, doubleFocalPath].map(testResources.wrap), focalPayloadElem)
    ).toThrowError();
  });
});
