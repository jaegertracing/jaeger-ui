// Copyright (c) 2017 Uber Technologies, Inc.
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

import queryString from 'query-string';

function firstParam(arg: string | string[]): string {
  if (Array.isArray(arg)) {
    const returnVal = arg[0];
    console.warn(`Found multiple query parameters: "${arg}", using "${returnVal}"`); // eslint-disable-line no-console
    return returnVal;
  }
  return arg;
}

type TExtracted = { service?: string; operation?: string; start?: number; end?: number };

export default function extractQuery(search: string = window.location.search): TExtracted {
  const { service, operation, start, end } = queryString.parse(search);
  const returnVal: TExtracted = {
    service: service && firstParam(service),
    operation: operation && firstParam(operation),
  };
  if (start) {
    returnVal.start = Number.parseInt(firstParam(start), 10);
  }
  if (end) {
    returnVal.end = Number.parseInt(firstParam(end), 10);
  }
  return returnVal;
}
