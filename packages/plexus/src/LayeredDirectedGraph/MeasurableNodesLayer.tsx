// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';

import { TNodesContainerPropsFactoryFn, TMeasurableNodeRenderer, TRendererUtils } from './types';
import { TLayoutVertex, TVertex } from '../types';

export type TMeasurableNodesLayerProps<T = {}> = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
  render: TMeasurableNodeRenderer<T>;
  setOnContainer?: TNodesContainerPropsFactoryFn<T>;
  setOnItem?: (
    vertex: TVertex<T>,
    utils: TRendererUtils,
    layoutVertex: TLayoutVertex<T> | null
  ) => Record<string, unknown> | null;
  children?: void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MeasurableNodesLayer<T = {}>(props: TMeasurableNodesLayerProps<T>) {
  return null;
}
