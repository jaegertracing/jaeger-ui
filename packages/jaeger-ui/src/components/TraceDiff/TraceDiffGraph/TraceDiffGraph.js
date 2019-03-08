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
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';
import cx from 'classnames';
import { connect } from 'react-redux';

import drawNodeGenerator from './drawNode';
import { getUiFindVertexKeys, getEdgesAndVertices } from './traceDiffGraphUtils';
import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import UiFindInput, { extractUiFindFromState } from '../../common/UiFindInput';
import { fetchedState } from '../../../constants';
import { setOnEdgesContainer, setOnNodesContainer, setOnNode } from '../../../utils/plexus/set-on-graph';

import type { FetchedTrace } from '../../../types';

import './TraceDiffGraph.css';

type Props = {
  a: ?FetchedTrace,
  b: ?FetchedTrace,
  uiFind?: string,
};

const { classNameIsSmall } = DirectedGraph.propsFactories;

export class UnconnectedTraceDiffGraph extends React.PureComponent<Props> {
  props: Props;
  layoutManager: LayoutManager;

  static defaultProps = {
    uiFind: '',
  };

  constructor(props: Props) {
    super(props);
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    const {
      a,
      b,
      // Flow requires `= ''` because it does not interpret defaultProps
      uiFind = '',
    } = this.props;
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
    const { edges, vertices } = getEdgesAndVertices(aData, bData);
    const keys = getUiFindVertexKeys(uiFind, vertices);
    const dagClassName = cx('TraceDiffGraph--dag', { 'is-uiFind-mode': uiFind });

    return (
      <div className="TraceDiffGraph--graphWrapper">
        <DirectedGraph
          minimap
          zoom
          arrowScaleDampener={0}
          className={dagClassName}
          minimapClassName="TraceDiffGraph--miniMap"
          layoutManager={this.layoutManager}
          getNodeLabel={drawNodeGenerator(keys)}
          setOnRoot={classNameIsSmall}
          setOnEdgesContainer={setOnEdgesContainer}
          setOnNodesContainer={setOnNodesContainer}
          setOnNode={setOnNode}
          edges={edges}
          vertices={vertices}
        />
        <UiFindInput
          inputProps={{
            className: 'TraceDiffGraph--uiFind',
            suffix: uiFind.length && String(keys.size),
          }}
        />
      </div>
    );
  }
}

export default connect(extractUiFindFromState)(UnconnectedTraceDiffGraph);
