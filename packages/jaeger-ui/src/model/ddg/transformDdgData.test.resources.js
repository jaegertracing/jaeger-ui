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

const simplePathElemMaker = label => ({
  operation: `${label}Operation`,
  service: `${label}Service`,
});

export const focalPathElem = simplePathElemMaker('focal');

const sameFocalServicePathElem = {
  operation: `not-${focalPathElem.operation}`,
  service: focalPathElem.service,
};

const pathLengthener = path => {
  const prequels = [];
  const sequels = [];
  path.forEach(({ operation, service }) => {
    if (operation !== focalPathElem.operation && service !== focalPathElem.service) {
      prequels.push({
        operation: `prequel-${operation}`,
        service,
      });
      sequels.push({
        operation,
        service: `sequel-${service}`,
      });
    }
  });
  return [...prequels, ...path, ...sequels];
};

const firstPathElem = simplePathElemMaker('first');
const beforePathElem = simplePathElemMaker('before');
const midPathElem = simplePathElemMaker('mid');
const afterPathElem = simplePathElemMaker('after');
const lastPathElem = simplePathElemMaker('last');

export const simplePath = [firstPathElem, beforePathElem, focalPathElem, afterPathElem, lastPathElem];
export const longSimplePath = pathLengthener(simplePath);
export const noFocalPath = [firstPathElem, beforePathElem, midPathElem, afterPathElem, lastPathElem];
export const doubleFocalPath = [
  firstPathElem,
  beforePathElem,
  focalPathElem,
  midPathElem,
  focalPathElem,
  afterPathElem,
  lastPathElem,
];
export const almostDoubleFocalPath = [
  firstPathElem,
  beforePathElem,
  sameFocalServicePathElem,
  midPathElem,
  focalPathElem,
  afterPathElem,
  lastPathElem,
];
