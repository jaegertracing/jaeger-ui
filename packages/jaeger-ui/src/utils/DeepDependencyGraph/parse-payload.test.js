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

// const fs = require('fs');

import _filter from 'lodash/filter';
import _flatten from 'lodash/flatten';
import _map from 'lodash/map';

import parsePayload from './parse-payload';
import * as testResource from './parse-payload.test.resource';

describe('parse payload', () => {

  function parsedOutputValidator(payload, focalIndices, groupOperations = false) {
    const { focalNode } = testResource;
    const focalNodeArgument = groupOperations
      ? { service: focalNode.service }
      : focalNode;
    const { paths, services } = parsePayload(payload, focalNodeArgument);
    const serviceNames = Object.keys(services);
    let membersProcessed = 0;
    expect(serviceNames).toEqual(Array.from(new Set(_map(_flatten(payload), 'service'))));
    serviceNames.forEach(serviceName => {
      expect(Object.keys(services[serviceName].operations)).toEqual(Array.from(new Set(_map(_filter(_flatten(payload), { service: serviceName}), 'operation'))));
    });

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
    const { simplePath } = testResource;
    parsedOutputValidator([simplePath], [2]);
  });

  it('parses a path with multiple operations per service and multiple services per operation', () => {
    const { longSimplePath } = testResource;
    parsedOutputValidator([longSimplePath], [6]);
  });

  it('parses a payload with significant overlap between paths', () => {
    const { simplePath, longSimplePath } = testResource;
    parsedOutputValidator([simplePath, longSimplePath], [2, 6]);
  });

  it('parses a path that contains the focal node twice', () => {
    const { doubleFocalPath } = testResource;
    parsedOutputValidator([doubleFocalPath], [2]);
  });

  it('checks both operation and service when calculating focalIdx when both are provided', () => {
    const { almostDoubleFocalPath } = testResource;
    parsedOutputValidator([almostDoubleFocalPath], [4]);
  });

  it('checks only service when calculating focalIdx when only service is provided', () => {
    const { almostDoubleFocalPath } = testResource;
    parsedOutputValidator([almostDoubleFocalPath], [2], true);
  });

  it('throws an error if a path lacks the focalNode', () => {
    const { simplePath, noFocalPath, doubleFocalPath, focalNode } = testResource;
    expect(() => parsePayload([simplePath, noFocalPath, doubleFocalPath], focalNode)).toThrowError();
  });
});
