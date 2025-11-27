// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import Chance from 'chance';

type DependencyLink = {
  parent: string;
  child: string;
  callCount: number;
};

type DependenciesOptions = {
  numOfNodes?: number;
  numOfLinks?: number;
};

type LinkOptions = {
  parent?: string;
  child?: string;
  callCount?: number;
};

type LinkFromNodesOptions = {
  nodeList: string[];
};

const chance = new Chance();

export default chance.mixin({
  dependencies({ numOfNodes = 45, numOfLinks = 45 }: DependenciesOptions = {}): DependencyLink[] {
    return chance.n(chance.linkFromNodes, numOfLinks, {
      nodeList: chance.n(chance.node, numOfNodes),
    });
  },

  node(): string {
    return chance.city();
  },

  link({
    parent = chance.city(),
    child = chance.city(),
    callCount = chance.integer({ min: 1, max: 250000000 }),
  }: LinkOptions = {}): DependencyLink {
    return { parent, child, callCount };
  },

  linkFromNodes({ nodeList }: LinkFromNodesOptions): DependencyLink {
    return chance.link({
      parent: chance.pickone(nodeList),
      child: chance.pickone(nodeList),
    });
  },
});
