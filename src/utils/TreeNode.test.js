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

import TreeNode from './TreeNode';

it('TreeNode constructor should return a tree node', () => {
  const node = new TreeNode(4);

  expect(node.value).toBe(4);
  expect(node.children).toEqual([]);
});

it('TreeNode constructor should return a tree node', () => {
  const node = new TreeNode(4, [new TreeNode(3)]);

  expect(node.value).toBe(4);
  expect(node.children).toEqual([new TreeNode(3)]);
});

it('depth should work for a single node', () => {
  expect(new TreeNode().depth).toBe(1);
});

it('depth should caluclate the depth', () => {
  let treeRoot = new TreeNode(1);
  let firstChildNode = new TreeNode(2);
  firstChildNode = firstChildNode.addChild(3);
  firstChildNode = firstChildNode.addChild(4);
  firstChildNode = firstChildNode.addChild(5);
  let secondChildNode = new TreeNode(6);
  let thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode = thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode = thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode = thirdDeepestChildNode.addChild(10);
  secondChildNode = secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode = firstChildNode.addChild(secondChildNode);
  treeRoot = treeRoot.addChild(firstChildNode);
  treeRoot = treeRoot.addChild(11);
  treeRoot = treeRoot.addChild(12);

  expect(treeRoot.depth).toBe(5);
  expect(secondChildNode.depth).toBe(3);
});

it('size should walk to get total number of nodes', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.size).toBe(12);
});

it('addChild() should add a child to the set', () => {
  const treeRoot = new TreeNode(4);
  treeRoot.addChild(3);
  treeRoot.addChild(1);
  treeRoot.addChild(2);

  expect(treeRoot).toEqual(
    new TreeNode(4, [new TreeNode(3), new TreeNode(1), new TreeNode(2)])
  );
});

it('addChild() should support taking a treenode', () => {
  const treeRoot = new TreeNode(4);
  const otherNode = new TreeNode(2);
  treeRoot.addChild(otherNode);
  treeRoot.addChild(1);
  treeRoot.addChild(2);

  expect(treeRoot).toEqual(
    new TreeNode(4, [otherNode, new TreeNode(1), new TreeNode(2)])
  );
});

it('addChild() should support the parent argument for nested insertion', () => {
  const treeRoot = new TreeNode(1);
  const secondTier = new TreeNode(2);
  const thirdTier = new TreeNode(3);
  treeRoot.addChild(secondTier);
  secondTier.addChild(thirdTier);

  expect(treeRoot).toEqual(
    new TreeNode(1, [new TreeNode(2, [new TreeNode(3)])])
  );
});

it('find() should return the found item for a function', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.find(value => value === 6)).toEqual(secondChildNode);
  expect(treeRoot.find(12)).toEqual(new TreeNode(12));
});

it('find() should return the found item for a value', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.find(7)).toEqual(thirdDeepestChildNode);
  expect(treeRoot.find(12)).toEqual(new TreeNode(12));
});

it('find() should return the found item for a treenode', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.find(thirdDeepestChildNode)).toEqual(thirdDeepestChildNode);
  expect(treeRoot.find(treeRoot)).toEqual(treeRoot);
});

it('find() should return null for none found', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.find(13)).toBe(null);
  expect(treeRoot.find(value => value === 'foo')).toBe(null);
});

it('getPath() should return the path to the node', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  expect(treeRoot.getPath(secondChildNode)).toEqual([
    treeRoot,
    firstChildNode,
    secondChildNode,
  ]);
});

it('getPath() should return null if the node is not in the tree', () => {
  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  const exteriorNode = new TreeNode(15);

  expect(treeRoot.getPath(exteriorNode)).toEqual(null);
});

it('walk() should iterate over every item once in the right order', () => {
  /**
   * 1
   * | 2
   * | | 3
   * | | 4
   * | | 5
   * | | 6
   * | | | 7
   * | | | | 8
   * | | | | 9
   * | | | | 10
   * | 11
   * | 12
   */

  const treeRoot = new TreeNode(1);
  const firstChildNode = new TreeNode(2);
  firstChildNode.addChild(3);
  firstChildNode.addChild(4);
  firstChildNode.addChild(5);
  const secondChildNode = new TreeNode(6);
  const thirdDeepestChildNode = new TreeNode(7);
  thirdDeepestChildNode.addChild(8);
  thirdDeepestChildNode.addChild(9);
  thirdDeepestChildNode.addChild(10);
  secondChildNode.addChild(thirdDeepestChildNode);
  firstChildNode.addChild(secondChildNode);
  treeRoot.addChild(firstChildNode);
  treeRoot.addChild(11);
  treeRoot.addChild(12);

  let i = 0;

  treeRoot.walk(value => expect(value).toBe(++i));
});
