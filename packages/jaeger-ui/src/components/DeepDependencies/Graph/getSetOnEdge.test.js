// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getSetOnEdge, { baseCase, matchMiss } from './getSetOnEdge';

import { getEdgeId } from '../../../model/ddg/GraphModel';
import { EViewModifier } from '../../../model/ddg/types';

describe('getSetOnEdge', () => {
  const makeEdge = (from, to) => ({
    edge: { from, to },
  });
  const hovered = makeEdge('test', 'hovered');
  const notHovered = makeEdge('not', 'hovered');
  const miss = makeEdge('test', 'miss');
  const vms = new Map([
    [getEdgeId(hovered.edge.from, hovered.edge.to), EViewModifier.PathHovered],
    [getEdgeId(notHovered.edge.from, notHovered.edge.to), EViewModifier.emphasized],
  ]);
  const fakeUtils = {
    getGlobalId: id => id,
  };

  it('returns base case when given empty map', () => {
    expect(getSetOnEdge(new Map())).toBe(baseCase);
  });

  it('returns function that returns miss if id is not in map as hovered', () => {
    const setOnEdge = getSetOnEdge(vms);

    expect(setOnEdge(miss, fakeUtils)).toBe(matchMiss);
    expect(setOnEdge(notHovered, fakeUtils)).toBe(matchMiss);
  });

  it('returns function that returns hovered edge class and hovered arrow if id is in map as hovered', () => {
    const setOnEdge = getSetOnEdge(vms);

    expect(setOnEdge(hovered, fakeUtils)).toEqual({
      className: expect.stringContaining('Hovered'),
      markerEnd: expect.stringContaining('hovered'),
    });
  });
});
