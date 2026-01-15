// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import HtmlLayer from './HtmlLayer';
import MeasurableNode from './MeasurableNode';
import MeasurableNodes from './MeasurableNodes';
import SvgLayer from './SvgLayer';
import {
  TExposedGraphState,
  TLayerType,
  TSetOnContainer,
  TMeasurableNodeRenderer,
  ELayoutPhase,
  ELayerType,
} from './types';
import { TSizeVertex, TVertex } from '../types';

type TProps<T = {}, U = {}> = Omit<TMeasurableNodeRenderer<T>, 'measurable'> &
  TSetOnContainer<T, U> & {
    getClassName: (name: string) => string;
    graphState: TExposedGraphState<T, U>;
    senderKey: string;
    layerType: TLayerType;
    setSizeVertices: (senderKey: string, sizeVertices: TSizeVertex<T>[]) => void;
    standalone?: boolean;
  };

function createRefs<T>(length: number): Array<React.RefObject<T>> {
  const rv: Array<React.RefObject<T>> = [];
  for (let i = 0; i < length; i++) {
    rv.push(React.createRef<T>() as React.RefObject<T>);
  }
  return rv;
}

const MeasurableNodesLayer = <T = {}, U = {}>(props: TProps<T, U>) => {
  const {
    getClassName,
    graphState,
    layerType,
    measureNode,
    renderNode,
    senderKey,
    setOnNode,
    setSizeVertices,
  } = props;

  const { layoutPhase, layoutVertices, renderUtils, vertices } = graphState;

  // Track vertices reference to detect changes
  const prevVerticesRef = React.useRef<TVertex<T>[]>(vertices);
  const [nodeRefs, setNodeRefs] = React.useState<Array<React.RefObject<MeasurableNode<T>>>>(() =>
    createRefs<MeasurableNode<T>>(vertices.length)
  );

  // Update refs when vertices change (replaces getDerivedStateFromProps)
  React.useEffect(() => {
    if (vertices !== prevVerticesRef.current) {
      prevVerticesRef.current = vertices;
      setNodeRefs(createRefs<MeasurableNode<T>>(vertices.length));
    }
  }, [vertices]);

  // Measure nodes after render (equivalent to componentDidMount + componentDidUpdate)
  React.useEffect(() => {
    if (layoutPhase !== ELayoutPhase.CalcSizes) {
      return;
    }
    if (!nodeRefs) {
      return;
    }

    let current: MeasurableNode<T> | null = null;
    const utils = measureNode && {
      layerType,
      getWrapper: () => {
        if (current) {
          return current.getRef();
        }
        throw new Error('Invalid scenario');
      },
      getWrapperSize: () => {
        if (current) {
          return current.measure();
        }
        throw new Error('Invalid scenario');
      },
    };

    const sizeVertices: TSizeVertex<T>[] = [];
    for (let i = 0; i < nodeRefs.length; i++) {
      current = nodeRefs[i].current;
      const vertex = vertices[i];
      if (current) {
        sizeVertices.push({
          vertex,
          ...(measureNode && utils ? measureNode(vertex, utils) : current.measure()),
        });
      }
    }
    setSizeVertices(senderKey, sizeVertices);
  }, [layoutPhase, nodeRefs, vertices, measureNode, layerType, senderKey, setSizeVertices]);

  if (!nodeRefs) {
    return null;
  }

  const LayerComponent = layerType === ELayerType.Html ? HtmlLayer : SvgLayer;

  return (
    <LayerComponent classNamePart="MeasurableNodesLayer" {...props}>
      <MeasurableNodes<T>
        nodeRefs={nodeRefs}
        getClassName={getClassName}
        layerType={layerType}
        renderNode={renderNode}
        renderUtils={renderUtils}
        vertices={vertices}
        layoutVertices={layoutVertices}
        setOnNode={setOnNode}
      />
    </LayerComponent>
  );
};

// React.memo provides shallow comparison equivalent to PureComponent
export default React.memo(MeasurableNodesLayer) as typeof MeasurableNodesLayer;
