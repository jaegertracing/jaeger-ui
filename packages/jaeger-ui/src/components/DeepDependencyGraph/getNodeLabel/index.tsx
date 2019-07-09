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
import { getUrl } from '../url';
import { EViewModifier, TDdgVertex } from '../../../model/ddg/types';

// temp fill in props
/* istanbul ignore next */
const noops = {
  setViewModifier(vertexKey: string, viewModifier: EViewModifier, enabled: boolean) {
    // eslint-disable-next-line no-console
    console.log(`set view modifier: ${enabled ? 'on' : 'OFF'} ${viewModifier} -- ${vertexKey}`);
  },
};

export default function getNodeLabel(vertex: TDdgVertex) {
  const { isFocalNode, key, operation, service } = vertex;
  return (
    <DdgNode
      vertexKey={key}
      service={service}
      operation={operation}
      isFocalNode={isFocalNode}
      viewModifiers={0}
      focalNodeUrl={isFocalNode ? null : getUrl({ operation, service })}
      {...noops}
    />
  );
}
