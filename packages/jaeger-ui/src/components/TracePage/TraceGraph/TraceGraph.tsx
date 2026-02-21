// Copyright (c) 2018 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Tooltip } from 'antd';
import { IoClose, IoHelpCircleOutline } from 'react-icons/io5';
import cx from 'classnames';
import { Digraph, LayoutManager, cacheAs } from '@jaegertracing/plexus';

import {
  getNodeRenderer,
  getNodeFindEmphasisRenderer,
  renderNodeVectorBorder,
  MODE_SERVICE,
  MODE_TIME,
  MODE_SELFTIME,
  getHelpTable,
} from './OpNode';
import { TEv, TSumSpan } from './types';
import { TDenseSpanMembers } from '../../../model/trace-dag/types';
import TDagPlexusVertex from '../../../model/trace-dag/types/TDagPlexusVertex';
import { TNil } from '../../../types';
import { TraceGraphConfig } from '../../../types/config';

import './TraceGraph.css';

type Props = {
  headerHeight: number;
  ev?: TEv | TNil;
  uiFind: string | TNil;
  uiFindVertexKeys: Set<string> | TNil;
  traceGraphConfig?: TraceGraphConfig;
  useOtelTerms: boolean;
};

const { classNameIsSmall, scaleOpacity, scaleStrokeOpacity } = Digraph.propsFactories;

export function setOnEdgePath(e: any) {
  return e.isNonBlocking ? { strokeDasharray: 4 } : {};
}

export const getHelpContent = (useOtelTerms: boolean) => (
  <div className="TraceGraph--help-content" data-testid="help-content">
    {getHelpTable(useOtelTerms)}
    <div>
      <table>
        <tbody>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small" className="active">
                S
              </Button>
            </td>
            <td>Service</td>
            <td>Colored by service</td>
          </tr>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small">
                T
              </Button>
            </td>
            <td>Time</td>
            <td>Colored by total time</td>
          </tr>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small">
                ST
              </Button>
            </td>
            <td>Selftime</td>
            <td>Colored by self time (*)</td>
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
          Non-Blocking
        </text>
      </svg>
    </div>
    <div>
      (*) <b>Self time</b> is the total time spent in a span when it was not waiting on children. For example,
      a 10ms span with two 4ms non-overlapping children would have <b>self-time = 10ms - 2 * 4ms = 2ms</b>.
    </div>
  </div>
);

function TraceGraph({
  headerHeight,
  ev = null,
  uiFind,
  uiFindVertexKeys,
  traceGraphConfig,
  useOtelTerms,
}: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState(MODE_SERVICE);

  // Use useMemo to create the LayoutManager only once based on the config
  const layoutManager = useMemo(
    () =>
      new LayoutManager({
        totalMemory: traceGraphConfig?.layoutManagerMemory,
        useDotEdges: true,
        splines: 'polyline',
      }),
    [traceGraphConfig?.layoutManagerMemory]
  );

  // Cleanup the layoutManager when the component unmounts
  useEffect(() => {
    return () => {
      layoutManager.stopAndRelease();
    };
  }, [layoutManager]);

  const handleShowHelp = () => {
    setShowHelp(true);
  };

  const handleCloseSidebar = () => {
    setShowHelp(false);
  };

  const toggleNodeMode = (newMode: string) => {
    setMode(newMode);
  };

  if (!ev) {
    return <h1 className="u-mt-vast u-tx-muted ub-tx-center">No trace found</h1>;
  }

  const wrapperClassName = cx('TraceGraph--graphWrapper', { 'is-uiFind-mode': uiFind });

  return (
    <div className={wrapperClassName} style={{ paddingTop: headerHeight + 47 }}>
      <Digraph<TDagPlexusVertex<TSumSpan & TDenseSpanMembers>>
        minimap
        zoom
        className="TraceGraph--dag"
        minimapClassName="u-miniMap"
        layoutManager={layoutManager}
        measurableNodesKey="nodes"
        layers={[
          {
            key: 'node-find-emphasis',
            layerType: 'svg',
            renderNode: getNodeFindEmphasisRenderer(uiFindVertexKeys),
          },
          {
            key: 'edges',
            edges: true,
            layerType: 'svg',
            defs: [{ localId: 'arrow' }],
            markerEndId: 'arrow',
            setOnContainer: [scaleOpacity, scaleStrokeOpacity],
            setOnEdge: setOnEdgePath,
          },
          {
            key: 'nodes-borders',
            layerType: 'svg',
            setOnContainer: scaleStrokeOpacity,
            renderNode: renderNodeVectorBorder,
          },
          {
            key: 'nodes',
            layerType: 'html',
            measurable: true,
            renderNode: cacheAs(`trace-graph/nodes/render/${mode}`, getNodeRenderer(mode, useOtelTerms)),
          },
        ]}
        setOnGraph={classNameIsSmall}
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
            <IoHelpCircleOutline onClick={handleShowHelp} data-testid="help-icon" />
          </li>
          <li>
            <Tooltip placement="left" title="Service">
              <Button
                className={cx('TraceGraph--btn-service', { active: mode === MODE_SERVICE })}
                htmlType="button"
                shape="circle"
                size="small"
                onClick={() => toggleNodeMode(MODE_SERVICE)}
              >
                S
              </Button>
            </Tooltip>
          </li>
          <li>
            <Tooltip placement="left" title="Time">
              <Button
                className={cx('TraceGraph--btn-time', { active: mode === MODE_TIME })}
                htmlType="button"
                shape="circle"
                size="small"
                onClick={() => toggleNodeMode(MODE_TIME)}
              >
                T
              </Button>
            </Tooltip>
          </li>
          <li>
            <Tooltip placement="left" title="Selftime">
              <Button
                className={cx('TraceGraph--btn-selftime', { active: mode === MODE_SELFTIME })}
                htmlType="button"
                shape="circle"
                size="small"
                onClick={() => toggleNodeMode(MODE_SELFTIME)}
              >
                ST
              </Button>
            </Tooltip>
          </li>
        </ul>
        {showHelp && (
          <Card
            title="Help"
            bordered={false}
            extra={
              <a onClick={handleCloseSidebar} role="button" aria-label="Close">
                <IoClose />
              </a>
            }
          >
            {getHelpContent(useOtelTerms)}
          </Card>
        )}
      </div>
    </div>
  );
}

export default React.memo(TraceGraph);
