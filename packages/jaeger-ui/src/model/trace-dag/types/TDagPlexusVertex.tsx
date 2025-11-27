// Copyright (c) 2019-2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { TVertex } from '@jaegertracing/plexus/lib/types';

import TDagNode from './TDagNode';

type TDagPlexusVertex<T extends { [k: string]: unknown }> = TVertex<{ data: TDagNode<T> }>;

export default TDagPlexusVertex;
