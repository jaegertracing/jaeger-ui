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

type TPayload = {
  operation: string;
  service: string;
}[][];

type TService = { // de-duped
  name: string;
  operations: Record<string, TOperation>;
  /* static service-based data added here later, e.g.: tier, PD link, uOwn link */
}

type TOperation = { // de-duped
  name: string;
  pathElems: TPathElem[];
  service: TService;
  /* static operation-based data added here later, e.g.: SLA(?) */
}

type TPathElem = { // super-duped
  memberOf: TPath;
  operation: TOperation;
  pathIdx: number; // in conjunction with focalIdx on TPath this can be used to calculate distance, isFocal, up/down stream
  visibilityIdx: number;
  /* dynamic, path-based, node data added here later, e.g.: contextual error rate */
}


type TPath = { // One TPath per payload path
  focalIdx: number; // Index of focal node in this path, helps with hops management
  members: TPathElem[];
  /* dynamic, path data added here later, e.g.: QPS */
}

/*
type TGraphEdge: { // Derived data
      pathEdges: TPathEdge[];
}
 */

type TOperationMap = Record<string, TOperation>;
type TServiceMap = Record<string, TService>;

type TParsedPayload = {
  // operations: TOperationMap;
  paths: TPath[];
  services: TServiceMap;
}

export default function parsePayload(payload: TPayload, focalNode: { service: string, operation?: string }): TParsedPayload {
  // const operationMap: TOperationMap = {};
  const serviceMap: TServiceMap = {};
  let visibilityIdx = 0;

  const paths = payload.map(payloadPath => {
    // path with stand-in values in order to have obj to which to assign memberOf for each pathElem.
    const path: TPath = {
      focalIdx: -1,
      members: [],
    };
    const members = payloadPath.map(({ operation, service }, i) => {
      if (!Reflect.has(serviceMap, service)) {
        serviceMap[service] = {
          name: service,
          operations: {},
        };
      }
      if (!Reflect.has(serviceMap[service].operations, operation)) {
        serviceMap[service].operations[operation] = {
          name: operation,
          service: serviceMap[service],
          pathElems: [],
        };
      }
      const pathElem = {
        memberOf: path,
        operation: serviceMap[service].operations[operation],
        pathIdx: i,
        visibilityIdx: visibilityIdx++,
      };
      pathElem.operation.pathElems.push(pathElem);
      if (path.focalIdx === -1 && service === focalNode.service && (focalNode.operation == null || operation == focalNode.operation)) {
        path.focalIdx = i;
      }

      Object.defineProperty(pathElem, 'distance', {
        get: () => pathElem.pathIdx - pathElem.memberOf.focalIdx,
      });

      return pathElem;
    });
    path.members = members;

    if (path.focalIdx === -1) {
      throw new Error('A payload path lacked the focalNode');
    }

    return path;
  });

  return {
    // operations: operationMap,
    paths,
    services: serviceMap,
  }
}
