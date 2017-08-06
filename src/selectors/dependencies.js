// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { createSelector } from 'reselect';

export const formatDependenciesAsNodesAndLinks = createSelector(
  ({ dependencies }) => dependencies,
  dependencies => {
    const data = dependencies.reduce(
      (response, link) => {
        const { nodeMap } = response;
        let { links } = response;

        // add both the parent and child to the node map, or increment their
        // call count.
        nodeMap[link.parent] = nodeMap[link.parent] ? nodeMap[link.parent] + link.callCount : link.callCount;
        nodeMap[link.child] = nodeMap[link.child]
          ? response.nodeMap[link.child] + link.callCount
          : link.callCount;

        // filter out self-dependent
        if (link.parent !== link.child) {
          links = links.concat([
            {
              source: link.parent,
              target: link.child,
              callCount: link.callCount,
              value: Math.max(Math.sqrt(link.callCount / 10000), 1),
            },
          ]);
        }

        return { nodeMap, links };
      },
      { nodeMap: {}, links: [] }
    );

    data.nodes = Object.keys(data.nodeMap).map(id => ({
      callCount: data.nodeMap[id],
      radius: Math.max(Math.log(data.nodeMap[id] / 1000), 3),
      orphan: data.links.findIndex(link => id === link.source || id === link.target) === -1,
      id,
    }));

    const { nodes, links } = data;

    return { nodes, links };
  }
);
