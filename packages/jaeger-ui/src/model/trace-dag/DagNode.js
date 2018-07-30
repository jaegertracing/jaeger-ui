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

import type { DenseSpan, NodeID } from './types';

// export type DiffMembers = {
//   a: ?DagNode<any>,
//   b: ?DagNode<any>,
// };

export default class DagNode {
  static getID(service: string, operation: string, parentID?: ?string): NodeID {
    const name = `${service}\t${operation}`;
    return parentID ? `${parentID}\n${name}` : name;
  }

  service: string;
  operation: string;
  parentID: ?NodeID;
  id: NodeID;
  // count: number;
  members: DenseSpan[];
  children: Set<NodeID>;
  data: {
    a: ?DagNode,
    b: ?DagNode,
  };

  constructor(service: string, operation: string, parentID?: ?NodeID) {
    this.service = service;
    this.operation = operation;
    this.parentID = parentID;
    this.id = DagNode.getID(service, operation, parentID);
    // this.count = 0;
    this.members = [];
    this.children = new Set();
    this.data = { a: null, b: null };
  }
}

export type DiffMembers = {
  a: ?DagNode,
  b: ?DagNode,
};

// export type DiffMembers = {
//   a: ?DagNode<any>,
//   b: ?DagNode<any>,
// };
