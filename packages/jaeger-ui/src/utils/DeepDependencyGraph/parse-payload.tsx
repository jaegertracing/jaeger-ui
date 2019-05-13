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

type TDdgPayload = {
  operation: string;
  service: string;
}[][];

type TDdgService = {
  name: string;
  operations: Map<string, TDdgOperation>;
};

type TDdgOperation = {
  name: string;
  pathElems: PathElem[];
  service: TDdgService;
};

type TDdgPath = {
  focalIdx: number;
  members: PathElem[];
};

type TDdgServiceMap = Map<string, TDdgService>;

type TDdgPathElemsByDistance = Map<number, PathElem[]>;

type TDdgParsedPayload = {
  paths: TDdgPath[];
  pathElemsByDistance: TDdgPathElemsByDistance;
  services: TDdgServiceMap;
};

class PathElem {
  memberOf: TDdgPath;
  operation: TDdgOperation;
  pathIdx: number;
  visibilityIdx?: number;

  constructor({ path, operation, pathIdx /*, visibilityIdx */ }: {
    path: TDdgPath;
    operation: TDdgOperation;
    pathIdx: number;
    // visibilityIdx: number;
  }) {
    this.memberOf = path;
    this.operation = operation;
    this.pathIdx = pathIdx;
    // this.visibilityIdx = visibilityIdx;
    operation.pathElems.push(this);
  }

  get distance() {
    return this.pathIdx - this.memberOf.focalIdx;
  }

  set visibiliityIdx(visibiliityIdx: number) {
    this.visibiliityIdx = visibiliityIdx;
  }

  get visibiliityIdx(): number {
    if (this.visibiliityIdx == null) {
      throw new Error('Visibility Index was never set for this PathElem');
    }
    return this.visibiliityIdx;
  }
}

export default function parsePayload(
  payload: TDdgPayload,
  { service: focalService, operation: focalOperation }: { service: string; operation?: string }
): TDdgParsedPayload {
  let furthestUpstream = 0;
  let furthestDownstream = 0;
  const serviceMap: TDdgServiceMap = new Map();
  const pathElemsByDistance: TDdgPathElemsByDistance = new Map();
  // let visibilityIdx = 0;

  const paths = payload.map(payloadPath => {
    // path with stand-in values in order to have obj to which to assign memberOf for each pathElem.
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
          service: service,
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
        /*
      if (path.focalIdx != null) {
        if (!pathElemsByDistance.has(
      }
         */

      return new PathElem({ path, operation, pathIdx: i /* , visibilityIdx: visibilityIdx++ */ });
    });
    if (path.focalIdx == null) {
      throw new Error('A payload path lacked the focalNode');
    }
    path.members = members;

    members.forEach(member => {
      if (!pathElemsByDistance.has(member.distance)) {
        pathElemsByDistance.set(member.distance, []);
      }
      (pathElemsByDistance.get(member.distance) as PathElem[]).push(member);
      if (member.distance < furthestDownstream) {
        furthestDownstream = member.distance;
      }
      if (member.distance > furthestUpstream) {
        furthestUpstream = member.distance;
      }
    });

    return path;
  });

  // console.log(pathElemsByDistance);
  // console.log(furthestUpstream, furthestDownstream);

  let upstream = 1;
  let downstream = 0;
  let visibilityIdx = 0;
  while(upstream <= furthestUpstream || downstream >= furthestDownstream) {
    // console.log(upstream, downstream);
    let nextToIndex: PathElem[];
    if ((Math.abs(downstream) < upstream && downstream >= furthestDownstream) || upstream > furthestUpstream) {
      nextToIndex = pathElemsByDistance.get(downstream--) as PathElem[];
    } else {
      nextToIndex = pathElemsByDistance.get(upstream++) as PathElem[];
    }
    // console.log(nextToIndex);
    nextToIndex.forEach(indexMe => {
      indexMe.visibilityIdx = visibilityIdx++;
      // console.log(indexMe);
    });
  }
  // console.log(pathElemsByDistance);

  return {
    paths,
    pathElemsByDistance,
    services: serviceMap,
  };
}
