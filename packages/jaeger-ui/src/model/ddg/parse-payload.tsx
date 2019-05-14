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

import {
  TDdgPayload,
  TDdgService,
  TDdgOperation,
  TDdgPath,
  TDdgServiceMap,
  TDdgPathElemsByDistance,
  TDdgParsedPayload,
  PathElem,
} from './types';

export default function parsePayload(
  payload: TDdgPayload,
  { service: focalService, operation: focalOperation }: { service: string; operation?: string }
): TDdgParsedPayload {
  const serviceMap: TDdgServiceMap = new Map();
  const pathElemsByDistance: TDdgPathElemsByDistance = new Map();

  const paths = payload.map(payloadPath => {
    const path = {} as TDdgPath;

    const members = payloadPath.map(({ operation: operationName, service: serviceName }, i) => {
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, {
          name: serviceName,
          operations: new Map(),
        });
      }
      const service = serviceMap.get(serviceName) as TDdgService;

      if (!service.operations.has(operationName)) {
        service.operations.set(operationName, {
          name: operationName,
          service,
          pathElems: [],
        });
      }
      const operation = service.operations.get(operationName) as TDdgOperation;

      if (
        path.focalIdx == null &&
        serviceName === focalService &&
        (focalOperation == null || operationName === focalOperation)
      ) {
        path.focalIdx = i;
      }

      return new PathElem({ path, operation, pathIdx: i });
    });

    if (path.focalIdx == null) {
      throw new Error('A payload path lacked the focalNode');
    }

    path.members = members;
    members.forEach(member => {
      if (pathElemsByDistance.has(member.distance)) {
        (pathElemsByDistance.get(member.distance) as PathElem[]).push(member);
      } else {
        pathElemsByDistance.set(member.distance, [member]);
      }
    });

    return path;
  });

  let upstream = 1;
  let downstream = 0;
  let visibilityIdx = 0;
  function setPathElemVisibilityIdx(pathElem: PathElem) {
    pathElem.visibilityIdx = visibilityIdx++; // eslint-disable-line no-param-reassign
  }
  while (pathElemsByDistance.has(upstream) || pathElemsByDistance.has(downstream)) {
    let nextArrayToIndex: PathElem[];
    if (
      (Math.abs(downstream) < upstream && pathElemsByDistance.has(downstream)) ||
      !pathElemsByDistance.has(upstream)
    ) {
      nextArrayToIndex = pathElemsByDistance.get(downstream--) as PathElem[];
    } else {
      nextArrayToIndex = pathElemsByDistance.get(upstream++) as PathElem[];
    }
    nextArrayToIndex.forEach(setPathElemVisibilityIdx);
  }

  return {
    paths,
    pathElemsByDistance,
    services: serviceMap,
  };
}
