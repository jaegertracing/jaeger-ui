// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const BASE_MATCH_SIZE = 8;
const SCALABLE_MATCH_SIZE = 4;

// TODO: get state type from @plexus
export function setOnEdgesContainer(state: { zoomTransform?: { k: number } }) {
  const { zoomTransform } = state;
  if (!zoomTransform) {
    return null;
  }
  const { k } = zoomTransform;
  const opacity = 0.1 + k * 0.9;
  return { style: { opacity, zIndex: 1, position: 'absolute', pointerEvents: 'none' } };
}

export function setOnNodesContainer(state: { zoomTransform?: { k: number } }) {
  const { zoomTransform } = state;
  const matchSize = BASE_MATCH_SIZE + SCALABLE_MATCH_SIZE / (zoomTransform?.k ?? 1);
  return {
    style: {
      outline: `transparent solid ${matchSize}px`,
    },
  };
}

export function setOnNode() {
  return {
    style: {
      outline: 'inherit',
    },
  };
}
