// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TDenseSpan } from './types';
import * as tagKeys from '../../constants/tag-keys';

// -	if span
//     -	is client span
//     -	is leaf
//     -	has parent.operation startsWith self-tag peer.service
//     -	has parent.operation endsWith self.operation
//     -	set self.service = self-tag peer.service
function fixLeafService(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  const { children, operation, parentID, attributes } = denseSpan;
  const parent = parentID != null && map.get(parentID);
  const kind = attributes[tagKeys.SPAN_KIND];
  const peerSvc = attributes[tagKeys.PEER_SERVICE];
  if (!parent || children.size > 0 || kind !== 'client' || !peerSvc) {
    return;
  }
  const { operation: parentOp } = parent;
  if (parentOp.indexOf(peerSvc) === 0 && parentOp.slice(-operation.length) === operation) {
    denseSpan.service = peerSvc;
  }
}

// -	if span
//     -	is server span
//     -	parent is client span
//     -	parent has one child (self)
//     -	(parent.operation OR parent-tag peer.service) startsWith self.service
//     -	set parent.skipToChild = true
function skipClient(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  const { parentID, service, attributes } = denseSpan;
  const parent = parentID != null && map.get(parentID);
  if (!parent) {
    return;
  }
  const kind = attributes[tagKeys.SPAN_KIND];
  const parentKind = parent.attributes[tagKeys.SPAN_KIND];
  const parentPeerSvc = parent.attributes[tagKeys.PEER_SERVICE] || '';
  if (kind === 'server' && parentKind === 'client' && parent.children.size === 1) {
    parent.skipToChild = parent.operation.indexOf(service) === 0 || parentPeerSvc.indexOf(service) === 0;
  }
}

// -	if span
//     -	is server span
//     -	has operation === tag http.method
//     -	(parent.operation OR parent-tag peer.service) startsWith self.service
//     - fix self.operation
function fixHttpOperation(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  const { parentID, operation, service, attributes } = denseSpan;
  const parent = parentID != null && map.get(parentID);
  if (!parent) {
    return;
  }
  const kind = attributes[tagKeys.SPAN_KIND];
  const httpMethod = attributes[tagKeys.HTTP_METHOD];
  if (kind !== 'server' || operation !== httpMethod) {
    return;
  }
  const parentPeerSvc = parent.attributes[tagKeys.PEER_SERVICE] || '';
  if (parent.operation.indexOf(service) === 0 || parentPeerSvc.indexOf(service) === 0) {
    const rx = new RegExp(`^${service}(::)?`);
    const endpoint = parent.operation.replace(rx, '');

    denseSpan.operation = `${httpMethod} ${endpoint}`;
  }
}

// -	if span
//     - has no tags
//     - has only one child
//     - parent.resource.serviceName === self.resource.serviceName
//     - set self.skipToChild = true
function skipAnnotationSpans(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  const { children, parentID, span } = denseSpan;
  if (children.size !== 1 || span.attributes.length !== 0) {
    return;
  }
  const parent = parentID != null && map.get(parentID);
  const childID = [...children][0];
  const child = childID != null && map.get(childID);
  if (!parent || !child) {
    return;
  }

  denseSpan.skipToChild = parent.span.resource.serviceName === span.resource.serviceName;
}

// -	if span
//     - is a client span
//     - has only one child
//     - the child is a server span
//     - parent.span.resource.serviceName === self.span.resource.serviceName
//     - set parent.skipToChild = true
function skipClientSpans(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  const { children, parentID, span, attributes } = denseSpan;
  if (children.size !== 1 || attributes[tagKeys.SPAN_KIND] !== 'client') {
    return;
  }
  const parent = parentID != null && map.get(parentID);
  const childID = [...children][0];
  const child = childID != null && map.get(childID);
  if (!parent || !child) {
    return;
  }

  denseSpan.skipToChild =
    child.attributes[tagKeys.SPAN_KIND] === 'client' &&
    parent.span.resource.serviceName === span.resource.serviceName;
}

export default function denseTransforms(denseSpan: TDenseSpan, map: Map<string, TDenseSpan>) {
  fixLeafService(denseSpan, map);
  skipClient(denseSpan, map);
  fixHttpOperation(denseSpan, map);
  skipAnnotationSpans(denseSpan, map);
  skipClientSpans(denseSpan, map);
}
