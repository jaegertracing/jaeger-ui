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

import parsePayload from './parse-payload';
import * as testResources from './parse-payload.test.resources';

describe('parse payload', () => {
  function parsedOutputValidator({ paths: payload, focalIndices, groupOperations = false }) {
    const { focalPathElem } = testResources;
    const focalPathElemArgument = groupOperations ? { service: focalPathElem.service } : focalPathElem;
    const { paths, services } = parsePayload(payload, focalPathElemArgument);

    expect(new Set(services.keys())).toEqual(new Set(_map(_flatten(payload), 'service')));
    services.forEach((service, serviceName) => {
      expect(new Set(service.operations.keys())).toEqual(
        new Set(_map(_filter(_flatten(payload), { service: serviceName }), 'operation'))
      );
    });

    let membersProcessed = 0;
    paths.forEach((path, pathResultIndex) => {
      expect(path.focalIdx).toBe(focalIndices[pathResultIndex]);
      path.members.forEach((member, memberResultIndex) => {
        const { distance, memberOf, operation, pathIdx, visibilityIdx } = member;
        expect(distance).toBe(pathIdx - focalIndices[pathResultIndex]);
        expect(memberOf).toBe(path);
        expect(operation.name).toBe(payload[pathResultIndex][memberResultIndex].operation);
        expect(operation.pathElems.includes(member)).toBe(true);
        expect(operation.service.name).toBe(payload[pathResultIndex][memberResultIndex].service);
        expect(pathIdx).toBe(memberResultIndex);
        expect(visibilityIdx).toBe(membersProcessed++);
      });
    });
  }

  it('parses an extremely simple payload', () => {
    const { simplePath } = testResources;
    parsedOutputValidator({ paths: [simplePath], focalIndices: [2] });
  });

  it('parses a path with multiple operations per service and multiple services per operation', () => {
    const { longSimplePath } = testResources;
    parsedOutputValidator({ paths: [longSimplePath], focalIndices: [6] });
  });

  it('parses a payload with significant overlap between paths', () => {
    const { simplePath, longSimplePath } = testResources;
    parsedOutputValidator({ paths: [simplePath, longSimplePath], focalIndices: [2, 6] });
  });

  it('parses a path that contains the focal path elem twice', () => {
    const { doubleFocalPath } = testResources;
    parsedOutputValidator({ paths: [doubleFocalPath], focalIndices: [2] });
  });

  it('checks both operation and service when calculating focalIdx when both are provided', () => {
    const { almostDoubleFocalPath } = testResources;
    parsedOutputValidator({ paths: [almostDoubleFocalPath], focalIndices: [4] });
  });

  it('checks only service when calculating focalIdx when only service is provided', () => {
    const { almostDoubleFocalPath } = testResources;
    parsedOutputValidator({ paths: [almostDoubleFocalPath], focalIndices: [2], groupOperations: true });
  });

  it('throws an error if a path lacks the focalPathElem', () => {
    const { simplePath, noFocalPath, doubleFocalPath, focalPathElem } = testResources;
    expect(() => parsePayload([simplePath, noFocalPath, doubleFocalPath], focalPathElem)).toThrowError();
  });
});
