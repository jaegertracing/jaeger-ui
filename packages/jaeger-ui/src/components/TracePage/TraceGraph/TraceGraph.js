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
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';
import DRange from 'drange';

import { getNodeDrawer, MODE_SERVICE, MODE_TIME, MODE_SELFTIME, HELP_TABLE } from './OpNode';
import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';
import {
  setOnEdgesContainer,
  setOnNodesContainer,
  setOnNode,
} from '../../TraceDiff/TraceDiffGraph/TraceDiffGraph';

import type { Trace, Span, KeyValuePair } from '../../../types/trace';

import './TraceGraph.css';

type SumSpan = {
  count: number,
  errors: number,
  time: number,
  percent: number,
  selfTime: number,
  percentSelfTime: number,
};

type Props = {
  headerHeight: number,
  trace: Trace,
};
type State = {
  showHelp: boolean,
  mode: string,
};

const { classNameIsSmall } = DirectedGraph.propsFactories;

export function setOnEdgePath(e: any) {
  return e.followsFrom ? { strokeDasharray: 4 } : {};
}

function extendFollowsFrom(edges: any, nodes: any) {
  return edges.map(e => {
    let hasChildOf = true;
    if (typeof e.to === 'number') {
      const n = nodes[e.to];
      hasChildOf = n.members.some(
        m => m.span.references && m.span.references.some(r => r.refType === 'CHILD_OF')
      );
    }
    return { ...e, followsFrom: !hasChildOf };
  });
}

export function isError(tags: Array<KeyValuePair>) {
  if (tags) {
    const errorTag = tags.find(t => t.key === 'error');
    if (errorTag) {
      return errorTag.value;
    }
  }
  return false;
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

  parentChildOfMap: { [string]: Span[] };
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

  calculateTraceDag(): TraceDag<SumSpan> {
    const traceDag: TraceDag<SumSpan> = new TraceDag();
    traceDag._initFromTrace(this.props.trace, {
      count: 0,
      errors: 0,
      time: 0,
      percent: 0,
      selfTime: 0,
      percentSelfTime: 0,
    });

    traceDag.nodesMap.forEach(n => {
      const ntime = n.members.reduce((p, m) => p + m.span.duration, 0);
      const numErrors = n.members.reduce((p, m) => (p + isError(m.span.tags) ? 1 : 0), 0);
      const childDurationsDRange = n.members.reduce((p, m) => {
        // Using DRange to handle overlapping spans (fork-join)
        const cdr = new DRange(m.span.startTime, m.span.startTime + m.span.duration).intersect(
          this.getChildOfDrange(m.span.spanID)
        );
        return p + cdr.length;
      }, 0);
      const stime = ntime - childDurationsDRange;
      const nd = {
        count: n.members.length,
        errors: numErrors,
        time: ntime,
        percent: 100 / this.props.trace.duration * ntime,
        selfTime: stime,
        percentSelfTime: 100 / ntime * stime,
      };
      // eslint-disable-next-line no-param-reassign
      n.data = nd;
    });
    return traceDag;
  }

  getChildOfDrange(parentID: string): number {
    const childrenDrange = new DRange();
    this.getChildOfSpans(parentID).forEach(s => {
      // -1 otherwise it will take for each child a micro (incluse,exclusive)
      childrenDrange.add(s.startTime, s.startTime + (s.duration <= 0 ? 0 : s.duration - 1));
    });
    return childrenDrange;
  }

  getChildOfSpans(parentID: string): Span[] {
    if (!this.parentChildOfMap) {
      this.parentChildOfMap = {};
      this.props.trace.spans.forEach(s => {
        if (s.references) {
          // Filter for CHILD_OF we don't want to calculate FOLLOWS_FROM (prod-cons)
          const parentIDs = s.references.filter(r => r.refType === 'CHILD_OF').map(r => r.spanID);
          parentIDs.forEach((pID: string) => {
            this.parentChildOfMap[pID] = this.parentChildOfMap[pID] || [];
            this.parentChildOfMap[pID].push(s);
          });
        }
      });
    }
    return this.parentChildOfMap[parentID] || [];
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
    const { headerHeight, trace } = this.props;
    const { showHelp, mode } = this.state;
    if (!trace) {
      return <h1 className="u-mt-vast u-tx-muted ub-tx-center">No trace found</h1>;
    }

    // Caching edges/vertices so that DirectedGraph is not redrawn
    let ev = this.cache;
    if (!ev) {
      const traceDag = this.calculateTraceDag();
      const nodes = [...traceDag.nodesMap.values()];
      ev = convPlexus(traceDag.nodesMap);
      ev.edges = extendFollowsFrom(ev.edges, nodes);
      this.cache = ev;
    }

    return (
      <div className="TraceGraph--graphWrapper" style={{ paddingTop: headerHeight + 49 }}>
        <DirectedGraph
          minimap
          zoom
          arrowScaleDampener={0}
          className="TraceGraph--dag"
          minimapClassName="TraceGraph--miniMap"
          layoutManager={this.layoutManager}
          getNodeLabel={getNodeDrawer(mode)}
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
