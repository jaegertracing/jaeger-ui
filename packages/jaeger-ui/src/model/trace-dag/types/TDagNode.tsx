// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { NodeID } from './index';

type TDagNode<TData extends { [k: string]: unknown }> = TData & {
  parentID: NodeID | null;
  id: NodeID;
  children: Set<NodeID>;
};

export default TDagNode;
