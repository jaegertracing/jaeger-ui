// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import Chance from 'chance';

const chance = new Chance();

export default chance.mixin({
  dependencies({ numOfNodes = 45, numOfLinks = 45 }) {
    return chance.n(chance.linkFromNodes, numOfLinks, {
      nodeList: chance.n(chance.node, numOfNodes),
    });
  },

  node() {
    return chance.city();
  },

  link({
    parent = chance.city(),
    child = chance.city(),
    callCount = chance.integer({ min: 1, max: 250000000 }),
  }) {
    return { parent, child, callCount };
  },

  linkFromNodes({ nodeList }) {
    return chance.link({
      parent: chance.pickone(nodeList),
      child: chance.pickone(nodeList),
    });
  },
});
