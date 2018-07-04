// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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

import * as tagKeys from '../../constants/tag-keys';

import type { DenseSpan } from './types';

// -	if span
//     -	is client span
//     -	is leaf
//     -	has parent.operation startsWith self-tag peer.service
//     -	has parent.operation endsWith self.operation
//     -	set self.service = self-tag peer.service
function fixLeafService(denseSpan: DenseSpan, map: Map<string, ?DenseSpan>) {
  const { children, operation, parentID, tags } = denseSpan;
  const parent = parentID && map.get(parentID);
  const kind = tags[tagKeys.SPAN_KIND];
  const peerSvc = tags[tagKeys.PEER_SERVICE];
  if (!parent || children.size > 0 || kind !== 'client' || !peerSvc) {
    return;
  }
  const { operation: parentOp } = parent;
  if (parentOp.indexOf(peerSvc) === 0 && parentOp.slice(-operation.length) === operation) {
    // eslint-disable-next-line no-param-reassign
    denseSpan.service = peerSvc;
  }
}

// -	if span
//     -	is server span
//     -	parent is client span
//     -	parent has one child (self)
//     -	(parent.operation OR parent-tag peer.service) startsWith self.service
//     -	set parent.skipToChild = true
function skipClient(denseSpan: DenseSpan, map: Map<string, ?DenseSpan>) {
  const { parentID, service, tags } = denseSpan;
  const parent = parentID && map.get(parentID);
  if (!parent) {
    return;
  }
  const kind = tags[tagKeys.SPAN_KIND];
  const parentKind = parent.tags[tagKeys.SPAN_KIND];
  const parentPeerSvc = parent.tags[tagKeys.PEER_SERVICE] || '';
  if (kind === 'server' && parentKind === 'client' && parent.children.size === 1) {
    parent.skipToChild = parent.operation.indexOf(service) === 0 || parentPeerSvc.indexOf(service) === 0;
  }
}

// -	if span
//     -	is server span
//     -	has operation === tag http.method
//     -	(parent.operation OR parent-tag peer.service) startsWith self.service
//     - fix self.operation
function fixHttpOperation(denseSpan: DenseSpan, map: Map<string, ?DenseSpan>) {
  const { parentID, operation, service, tags } = denseSpan;
  const parent = parentID && map.get(parentID);
  if (!parent) {
    return;
  }
  const kind = tags[tagKeys.SPAN_KIND];
  const httpMethod = tags[tagKeys.HTTP_METHOD];
  if (kind !== 'server' || operation !== httpMethod) {
    return;
  }
  const parentPeerSvc = parent.tags[tagKeys.PEER_SERVICE] || '';
  if (parent.operation.indexOf(service) === 0 || parentPeerSvc.indexOf(service) === 0) {
    const rx = new RegExp(`^${service}(::)?`);
    const endpoint = parent.operation.replace(rx, '');
    // eslint-disable-next-line no-param-reassign
    denseSpan.operation = `${httpMethod} ${endpoint}`;
  }
}

export default function denseTransforms(denseSpan: DenseSpan, map: Map<string, ?DenseSpan>) {
  fixLeafService(denseSpan, map);
  skipClient(denseSpan, map);
  fixHttpOperation(denseSpan, map);
}
