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

import * as React from 'react';

import DdgNode from './DdgNode';
import { DdgVertex, StyleStates } from '../../../model/ddg/types';

// temp fill in props
const noops = {
  setAsFocalNode(service: string, operation: string | null) {
    // eslint-disable-next-line no-console
    console.log(`set as focal: ${service} -- ${operation}`);
  },
  setViewModifier(id: string, viewModifier: StyleStates, enabled: boolean) {
    // eslint-disable-next-line no-console
    console.log(`set view modifier: ${enabled ? 'on' : 'OFF'} ${viewModifier} -- ${id}`);
  },
};

// temp -- transform DdgVertex for rendering purposes
export default function getNodeLabel(vertex: DdgVertex) {
  const pathElem = [...vertex.pathElems.values()][0];
  if (!pathElem) {
    throw new Error('Invalid vertex state');
  }
  const { name: operationName, service } = pathElem.operation;
  const isFocalNode = pathElem.memberIdx === pathElem.memberOf.focalIdx;
  return (
    <DdgNode
      id={vertex.key}
      service={service.name}
      operation={operationName}
      isFocalNode={isFocalNode}
      viewModifiers={0}
      {...noops}
    />
  );
}
