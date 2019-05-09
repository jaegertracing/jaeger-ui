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

const simpleNodeMaker = label => ({
  operation: `${label}Operation`,
  service: `${label}Service`,
});

export const focalNode = simpleNodeMaker('focal');
export const sameFocalServiceNode = {
  operation: `not-${focalNode.operation}`,
  service: focalNode.service,
};

const pathLengthener = path => {
  const prequels = [];
  const sequels = [];
  path.forEach(({ operation, service }) => {
    if (operation !== focalNode.operation && service !== focalNode.service) {
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
}

const firstNode = simpleNodeMaker('first');
const beforeNode = simpleNodeMaker('before');
const afterNode = simpleNodeMaker('after');
const lastNode = simpleNodeMaker('last');

export const simplePath = [firstNode, beforeNode, focalNode, afterNode, lastNode];
export const longSimplePath = pathLengthener([firstNode, beforeNode, focalNode, afterNode, lastNode]);

const midNode = simpleNodeMaker('mid');

export const noFocalPath = [firstNode, beforeNode, midNode, afterNode, lastNode];
export const doubleFocalPath = [firstNode, beforeNode, focalNode, midNode, focalNode, afterNode, lastNode];
export const almostDoubleFocalPath = [firstNode, beforeNode, sameFocalServiceNode, midNode, focalNode, afterNode, lastNode];
