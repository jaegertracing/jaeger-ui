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

import * as React from 'react';
import { Icon } from 'antd';
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';

import drawNode from './drawNode';
import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import UIFindInput from '../../common/UIFindInput';
import { fetchedState } from '../../../constants';
import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';

import type { FetchedTrace } from '../../../types';

import './TraceDiffGraph.css';

type Props = {
  a: ?FetchedTrace,
  b: ?FetchedTrace,
};

const { classNameIsSmall } = DirectedGraph.propsFactories;

function setOnEdgesContainer(state: Object) {
  const { zoomTransform } = state;
  if (!zoomTransform) {
    return null;
  }
  const { k } = zoomTransform;
  const opacity = 0.1 + k * 0.9;
  return { style: { opacity, zIndex: 1, position: 'absolute', pointerEvents: 'none' } };
}

export default class TraceDiffGraph extends React.PureComponent<Props> {
  props: Props;
  layoutManager: LayoutManager;

  constructor(props: Props) {
    super(props);
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    const { a, b } = this.props;
    if (!a || !b) {
      return <h1 className="u-mt-vast u-tx-muted ub-tx-center">At least two Traces are needed</h1>;
    }
    if (a.error || b.error) {
      return (
        <div className="TraceDiffGraph--errorsWrapper">
          {a.error && (
            <ErrorMessage
              className="ub-my4"
              error={a.error}
              messageClassName="TraceDiffGraph--errorMessage"
            />
          )}
          {b.error && (
            <ErrorMessage
              className="ub-my4"
              error={b.error}
              messageClassName="TraceDiffGraph--errorMessage"
            />
          )}
        </div>
      );
    }
    if (a.state === fetchedState.LOADING || b.state === fetchedState.LOADING) {
      return <LoadingIndicator className="u-mt-vast" centered />;
    }
    const aData = a.data;
    const bData = b.data;
    if (!aData || !bData) {
      return <div className="TraceDiffGraph--graphWrapper" />;
    }
    const aTraceDag = TraceDag.newFromTrace(aData);
    const bTraceDag = TraceDag.newFromTrace(bData);
    const diffDag = TraceDag.diff(aTraceDag, bTraceDag);
    const { edges, vertices } = convPlexus(diffDag.nodesMap);

    return (
      <div className="TraceDiffGraph--graphWrapper">
        <DirectedGraph
          minimap
          zoom
          arrowScaleDampener={0}
          className="TraceDiffGraph--dag"
          minimapClassName="TraceDiffGraph--miniMap"
          layoutManager={this.layoutManager}
          getNodeLabel={drawNode}
          setOnRoot={classNameIsSmall}
          setOnEdgesContainer={setOnEdgesContainer}
          setOnNodesContainer={null /* setOnNodesContainer */}
          edges={edges}
          vertices={vertices}
        />
        <div className="TraceDiffGraph--uiFind">
          <UIFindInput inputProps={{ className: 'TraceDiffGraph--uiFind--input', id: 'uiFind--input' }} />
          <label htmlFor="uiFind--input">
            <Icon className="TraceDiffGraph--uiFind--icon" type="search" />
          </label>
        </div>
      </div>
    );
  }
}
