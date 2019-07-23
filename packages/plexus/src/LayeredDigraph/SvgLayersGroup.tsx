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

import SvgEdgesLayer from './SvgEdgesLayer';
import { TExposedGraphState, TSvgLayersGroup } from './types';
import { assignMergeCss, getProps } from './utils';
import SvgDoc from './SvgDoc';

type TProps<T = {}, U = {}> = Omit<TSvgLayersGroup<T, U>, 'layerType' | 'key'> & {
  classNamePrefix?: string;
  graphState: TExposedGraphState<T, U>;
};

export default class SvgLayersGroup<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  private renderLayers() {
    const { classNamePrefix, layers, graphState } = this.props;
    return layers.map(layer => {
      if (layer.edges) {
        // omit props we don't need to pass on
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { edges, measurable, setOnNode, nodeRender, ...edgeProps } = layer;
        return (
          <SvgEdgesLayer<T, U> {...edgeProps} classNamePrefix={classNamePrefix} graphState={graphState} />
        );
      }
      // nodes layer or meassurable nodes layer
      throw new Error('Not implemented');
    });
  }

  render() {
    const { classNamePrefix, defs, graphState, setOnContainer } = this.props;
    const gProps = assignMergeCss(getProps(setOnContainer, graphState), {
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgLayersGroup`,
    });
    return (
      <SvgDoc classNamePrefix={classNamePrefix} graphState={graphState} defs={defs}>
        <g {...gProps}>{this.renderLayers()}</g>
      </SvgDoc>
    );
  }
}
