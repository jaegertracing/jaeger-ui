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

type TService = {
  name: string;
  operations: Record<string, TOperation>;
};

type TOperation = {
  name: string;
  pathElems: TPathElem[];
  service: TService;
};

type TPathElem = {
  memberOf: TPath;
  operation: TOperation;
  pathIdx: number;
  visibilityIdx: number;
};

type TPath = {
  focalIdx: number;
  members: TPathElem[];
};

type TServiceMap = Record<string, TService>;

type TParsedPayload = {
  paths: TPath[];
  services: TServiceMap;
};

export default function parsePayload(
  payload: TPayload,
  { service: focalService, operation: focalOperation }: { service: string; operation?: string }
): TParsedPayload {
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
      Object.defineProperty(pathElem, 'distance', {
        get: () => pathElem.pathIdx - pathElem.memberOf.focalIdx,
      });
      pathElem.operation.pathElems.push(pathElem);

      if (
        path.focalIdx === -1 &&
        service === focalService &&
        (focalOperation == null || operation === focalOperation)
      ) {
        path.focalIdx = i;
      }

      return pathElem;
    });
    path.members = members;

    if (path.focalIdx === -1) {
      throw new Error('A payload path lacked the focalNode');
    }

    return path;
  });

  return {
    paths,
    services: serviceMap,
  };
}
