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
import { cacheAs, Digraph, LayoutManager } from '@jaegertracing/plexus';
import cx from 'classnames';
import { connect } from 'react-redux';

import renderNode, { getNodeEmphasisRenderer } from './renderNode';
import { getUiFindVertexKeys, getEdgesAndVertices } from './traceDiffGraphUtils';
import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import UiFindInput, { extractUiFindFromState, TExtractUiFindFromStateReturn } from '../../common/UiFindInput';
import { fetchedState } from '../../../constants';
import { FetchedTrace, TNil } from '../../../types';

import './TraceDiffGraph.css';

type Props = {
  a: FetchedTrace | TNil;
  b: FetchedTrace | TNil;
} & TExtractUiFindFromStateReturn;

const { classNameIsSmall, scaleOpacity, scaleStrokeOpacity } = Digraph.propsFactories;

export class UnconnectedTraceDiffGraph extends React.PureComponent<Props> {
  layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });

  cacheAs = cacheAs.makeScope();

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    const { a, b, uiFind = '' } = this.props;
    if (!a || !b) {
      return (
        <div className="TraceDiffGraph--emptyState">
          <div className="TraceDiffGraph--emptyStateContent">
            <div className="TraceDiffGraph--emptyStateIcon">
              <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="40" y="35" textAnchor="middle" fill="#333" fontWeight="bold" fontSize="32">A</text>
                <line x1="60" y1="0" x2="60" y2="50" stroke="#199" strokeWidth="3"/>
                <text x="80" y="35" textAnchor="middle" fill="#333" fontWeight="bold" fontSize="32">B</text>
              </svg>
            </div>
            <h1 className="TraceDiffGraph--emptyStateTitle">At least two Traces are needed</h1>
            <p className="ub-tx-center">Select traces using the dropdowns above or from the search results page</p>
            <div className="TraceDiffGraph--emptyStateActions">
              <button 
                className="TraceDiffGraph--emptyStateButton" 
                onClick={() => window.location.href = '/search'}
              >
                Go to Search
              </button>
              <button 
                className="TraceDiffGraph--helpButton"
                onClick={() => window.open('https://medium.com/jaegertracing/trace-comparisons-arrive-in-jaeger-1-7-a97ad5e2d05d', '_blank')}
              >
                Learn how to compare traces
              </button>
            </div>
          </div>
        </div>
      );
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
    const inputProps: Record<string, string | undefined> = {
      className: 'TraceDiffGraph--uiFind',
      suffix: uiFind.length ? String(keys.size) : undefined,
    };

    return (
      <div className="TraceDiffGraph--graphWrapper">
        <Digraph
          // `key` is necessary to see updates to the graph when a or b changes
          // TODO(joe): debug this issue in Digraph
          key={`${a.id} vs ${b.id}`}
          minimap
          zoom
          className={dagClassName}
          minimapClassName="u-miniMap"
          layoutManager={this.layoutManager}
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'emphasis-nodes',
              layerType: 'svg',
              renderNode: getNodeEmphasisRenderer(keys),
            },
            {
              key: 'edges',
              layerType: 'svg',
              edges: true,
              defs: [{ localId: 'arrow' }],
              markerEndId: 'arrow',
              setOnContainer: this.cacheAs('edges/container', [
                scaleOpacity,
                scaleStrokeOpacity,
                { stroke: '#444' },
              ]),
            },
            {
              renderNode,
              key: 'nodes',
              measurable: true,
              layerType: 'html',
            },
          ]}
          setOnGraph={[classNameIsSmall, { style: { position: 'static' } }]}
          edges={edges}
          vertices={vertices}
        />
        <UiFindInput inputProps={inputProps} />
      </div>
    );
  }
}

export default connect(extractUiFindFromState)(UnconnectedTraceDiffGraph);
