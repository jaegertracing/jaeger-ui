// @flow

// Copyright (c) 2018 The Jaeger Authors.
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
import { Card, Icon, Button, Tooltip } from 'antd';
import cx from 'classnames';
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';

import { getNodeDrawer, MODE_SERVICE, MODE_TIME, MODE_SELFTIME, HELP_TABLE } from './OpNode';
import {
  setOnEdgesContainer,
  setOnNodesContainer,
  setOnNode,
} from '../../TraceDiff/TraceDiffGraph/TraceDiffGraph';

import './TraceGraph.css';

type Props = {
  headerHeight: number,
  ev: Object,
  uiFind: string,
  uiFindVertexKeys: Set<number | string>,
};
type State = {
  showHelp: boolean,
  mode: string,
};

const { classNameIsSmall } = DirectedGraph.propsFactories;

export function setOnEdgePath(e: any) {
  return e.followsFrom ? { strokeDasharray: 4 } : {};
}

const HELP_CONTENT = (
  <div className="TraceGraph--help-content">
    {HELP_TABLE}
    <div>
      <table width="100%">
        <tbody>
          <tr>
            <td>
              <Button shape="circle" size="small">
                S
              </Button>
            </td>
            <td>Service</td>
            <td>Colored by service</td>
          </tr>
          <tr>
            <td>
              <Button shape="circle" size="small">
                T
              </Button>
            </td>
            <td>Time</td>
            <td>Colored by total time</td>
          </tr>
          <tr>
            <td>
              <Button shape="circle" size="small">
                ST
              </Button>
            </td>
            <td>Selftime</td>
            <td>Colored by self time</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <svg width="100%" height="40">
        <line x1="0" y1="10" x2="90" y2="10" style={{ stroke: '#000', strokeWidth: 2 }} />
        <text alignmentBaseline="middle" x="100" y="10">
          ChildOf
        </text>
        <line
          x1="0"
          y1="30"
          x2="90"
          y2="30"
          style={{ stroke: '#000', strokeWidth: 2, strokeDasharray: '4' }}
        />
        <text alignmentBaseline="middle" x="100" y="30">
          FollowsFrom
        </text>
      </svg>
    </div>
  </div>
);

export default class TraceGraph extends React.PureComponent<Props, State> {
  props: Props;
  state: State;

  cache: any;

  layoutManager: LayoutManager;

  constructor(props: Props) {
    super(props);
    this.state = {
      showHelp: false,
      mode: MODE_SERVICE,
    };
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  toggleNodeMode(newMode: string) {
    this.setState({ mode: newMode });
  }

  showHelp = () => {
    this.setState({ showHelp: true });
  };

  closeSidebar = () => {
    this.setState({ showHelp: false });
  };

  render() {
    const { ev, headerHeight, uiFind, uiFindVertexKeys } = this.props;
    const { showHelp, mode } = this.state;
    if (!ev) {
      return <h1 className="u-mt-vast u-tx-muted ub-tx-center">No trace found</h1>;
    }

    const wrapperClassName = cx('TraceGraph--graphWrapper', { uiFind });

    return (
      <div className={wrapperClassName} style={{ paddingTop: headerHeight + 49 }}>
        <DirectedGraph
          minimap
          zoom
          arrowScaleDampener={0}
          className="TraceGraph--dag"
          minimapClassName="TraceGraph--miniMap"
          layoutManager={this.layoutManager}
          getNodeLabel={getNodeDrawer(mode, uiFindVertexKeys)}
          setOnRoot={classNameIsSmall}
          setOnEdgePath={setOnEdgePath}
          setOnEdgesContainer={setOnEdgesContainer}
          setOnNodesContainer={setOnNodesContainer}
          setOnNode={setOnNode}
          edges={ev.edges}
          vertices={ev.vertices}
        />
        <a
          className="TraceGraph--experimental"
          href="https://github.com/jaegertracing/jaeger-ui/issues/293"
          target="_blank"
          rel="noopener noreferrer"
        >
          Experimental
        </a>
        <div className="TraceGraph--sidebar-container">
          <ul className="TraceGraph--menu">
            <li>
              <Icon type="question-circle" onClick={this.showHelp} />
            </li>
            <li>
              <Tooltip placement="left" title="Service">
                <Button
                  className="TraceGraph--btn-service"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_SERVICE)}
                >
                  S
                </Button>
              </Tooltip>
            </li>
            <li>
              <Tooltip placement="left" title="Time">
                <Button
                  className="TraceGraph--btn-time"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_TIME)}
                >
                  T
                </Button>
              </Tooltip>
            </li>
            <li>
              <Tooltip placement="left" title="Selftime">
                <Button
                  className="TraceGraph--btn-selftime"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_SELFTIME)}
                >
                  ST
                </Button>
              </Tooltip>
            </li>
          </ul>
          {showHelp && (
            <section className="TraceGraph--sidebar">
              <Card
                title="Help"
                bordered={false}
                extra={
                  <a onClick={this.closeSidebar} role="button">
                    <Icon type="close" />
                  </a>
                }
              >
                {HELP_CONTENT}
              </Card>
            </section>
          )}
        </div>
      </div>
    );
  }
}
