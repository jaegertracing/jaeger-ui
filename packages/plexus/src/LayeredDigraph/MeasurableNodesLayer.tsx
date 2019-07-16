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

import MeasurableHtmlNode from './MeasurableHtmlNode';
import {
  TExposedGraphState,
  TElemType,
  TSetOnContainer,
  TMeasurableNodeRenderer,
  ELayoutPhase,
} from './types';
import { assignMergeCss, getProps } from './utils';
import { TSizeVertex, TVertex } from '../types';
import { TOneOfTwo } from '../types/TOneOf';

type TProps<T = {}, U = {}> = TElemType &
  Omit<TMeasurableNodeRenderer<T>, 'measurable'> &
  TSetOnContainer<T, U> & {
    classNamePrefix?: string;
    graphState: TExposedGraphState<T, U>;
    senderKey: string;
    setSizeVertices: (senderKey: string, sizeVertices: TSizeVertex<T>[]) => void;
  };

type TState<T> = TOneOfTwo<
  {
    htmlNodeRefs: React.RefObject<MeasurableHtmlNode<T>>[];
  },
  {
    svgNodeRefs: React.RefObject<any>[];
  }
> & {
  vertices: TVertex<T>[];
};

function createRefs<T>(length: number) {
  const rv: React.RefObject<T>[] = [];
  for (let i = 0; i < length; i++) {
    rv.push(React.createRef<T>());
  }
  return rv;
}

// TODO - parameterize to handle SVG too
export default class MeasurableNodesLayer<T = {}, U = {}> extends React.PureComponent<
  TProps<T, U>,
  TState<T>
> {
  static getDerivedStateFromProps<T>(nextProps: TProps<T>, prevState: TState<T>) {
    const { vertices } = nextProps.graphState;
    const { vertices: stVertices } = prevState;
    if (vertices === stVertices) {
      return null;
    }
    return {
      vertices,
      htmlNodeRefs: createRefs<MeasurableHtmlNode<T>>(vertices.length),
    };
  }

  constructor(props: TProps<T, U>) {
    super(props);
    const { graphState, html } = props;
    if (html) {
      const { vertices } = graphState;
      this.state = {
        vertices,
        htmlNodeRefs: createRefs<MeasurableHtmlNode<T>>(vertices.length),
      };
    } else {
      // props.svg === true
      throw new Error('Not implemented');
    }
  }

  componentDidMount() {
    this.measureNodes();
  }

  componentDidUpdate() {
    this.measureNodes();
  }

  private measureNodes() {
    const { layoutPhase, vertices } = this.props.graphState;
    if (layoutPhase !== ELayoutPhase.CalcSizes) {
      return;
    }
    const { htmlNodeRefs } = this.state;
    if (!htmlNodeRefs) {
      return;
    }
    const sizeVertices: TSizeVertex<T>[] = [];
    htmlNodeRefs.forEach((ref, i) => {
      const { current } = ref;
      if (current) {
        sizeVertices.push({
          ...current.measure(),
          vertex: vertices[i],
        });
      } else {
        // eslint-disable-next-line no-console
        console.error(`Invalid ref state: current is ${current}`);
      }
    });
    const { senderKey, setSizeVertices } = this.props;
    setSizeVertices(senderKey, sizeVertices);
  }

  // TODO - parameterize to handle SVG too
  private renderVertices(htmlNodeRefs: React.RefObject<MeasurableHtmlNode<T>>[]) {
    const {
      classNamePrefix,
      graphState: { layoutVertices, renderUtils, vertices },
      nodeRender,
      setOnNode,
    } = this.props;
    return vertices.map((vertex, i) => (
      <MeasurableHtmlNode<T>
        key={vertex.key}
        classNamePrefix={classNamePrefix}
        ref={htmlNodeRefs[i]}
        hidden={!layoutVertices}
        nodeRender={nodeRender}
        renderUtils={renderUtils}
        vertex={vertex}
        layoutVertex={layoutVertices && layoutVertices[i]}
        setOnNode={setOnNode}
      />
    ));
  }

  render() {
    const { htmlNodeRefs } = this.state;
    if (htmlNodeRefs) {
      const { classNamePrefix, graphState, setOnContainer } = this.props;
      const containerProps = assignMergeCss(getProps(setOnContainer, graphState), {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
        },
        className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--MeasurableNodesLayer`,
      });
      return <div {...containerProps}>{this.renderVertices(htmlNodeRefs)}</div>;
    }
    return null;
  }
}
