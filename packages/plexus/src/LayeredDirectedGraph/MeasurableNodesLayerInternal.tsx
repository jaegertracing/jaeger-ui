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
import { TMeasurableNodesLayerProps } from './MeasurableNodesLayer';
import { TRendererUtils, ELayoutPhase } from './types';
import { mergeClassNameAndStyle } from '../DirectedGraph/prop-factories/mergePropSetters';
import { TLayoutVertex, TSizeVertex, TVertex, TLayoutGraph } from '../types';
import TOneOf from '../types/TOneOf';

type TMeasurableNodesLayerInternalProps<T = {}> = TMeasurableNodesLayerProps<T> &
  TOneOf<{ isHtml: true }, { isSvg: true }> & {
    classNamePrefix: string;
    layoutGraph: TLayoutGraph | null;
    layoutPhase: ELayoutPhase;
    layoutVertices: TLayoutVertex<T>[] | null;
    renderUtils: TRendererUtils;
    setSizeVertices: (sizeVertices: TSizeVertex<T>[]) => void;
    vertices: TVertex<T>[];
  };

type TState<T> = TOneOf<
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
export default class MeasurableNodesLayerInternal<T = {}> extends React.PureComponent<
  TMeasurableNodesLayerInternalProps<T>,
  TState<T>
> {
  // Set the type for `props` directly to avoid `children: React.ReactNode`. Also,
  // avoid strictPropertyInitialization via `!` since the constructor will initialize it.
  props!: TMeasurableNodesLayerInternalProps<T>;

  static getDerivedStateFromProps<T>(nextProps: TMeasurableNodesLayerInternalProps<T>, prevState: TState<T>) {
    const { vertices } = nextProps;
    const { vertices: stVertices } = prevState;
    if (vertices === stVertices) {
      return null;
    }
    return {
      // edges,
      vertices,
      // layoutPhase: PHASE_CALC_SIZES,
      htmlNodeRefs: createRefs<MeasurableHtmlNode<T>>(vertices.length),
      // sizeVertices: null,
      // layoutEdges: null,
      // layoutGraph: null,
      // layoutVertices: null,
    };
  }

  constructor(props: TMeasurableNodesLayerInternalProps<T>) {
    super(props);
    const { isHtml = false, isSvg = false, vertices } = props;
    if (isHtml) {
      this.state = {
        vertices,
        htmlNodeRefs: createRefs<MeasurableHtmlNode<T>>(vertices.length),
        // svgNodeRefs: undefined,
      };
      // } else if (isSvg) {
      //   console.log(isSvg);
      //   this.state = {
      //     containerType: EContainerType.Svg,
      //     svgNodeRefs: createRefs<any>(length),
      //     // htmlNodeRefs: undefined,
      //   };
    } else {
      throw new Error(`Invalid isSvg (${isSvg}) and isHtml (${isHtml})`);
    }
  }

  componentDidMount() {
    this.measureNodes();
  }

  componentDidUpdate() {
    this.measureNodes();
  }

  private measureNodes() {
    const { vertices, layoutVertices, setSizeVertices } = this.props;
    if (layoutVertices) {
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
    setSizeVertices(sizeVertices);
  }

  // TODO - parameterize to handle SVG too
  private renderVertices(htmlNodeRefs: React.RefObject<MeasurableHtmlNode<T>>[]) {
    const {
      className,
      classNamePrefix,
      layoutVertices,
      render,
      renderUtils,
      setOnItem,
      vertices,
      ...extraRest
    } = this.props;

    // props that shouldn't be passed through
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, isHtml, layoutGraph, layoutPhase, setSizeVertices, ...rest } = extraRest;
    return vertices.map((vertex, i) => (
      <MeasurableHtmlNode<T>
        key={vertex.key}
        classNamePrefix={classNamePrefix}
        ref={htmlNodeRefs[i]}
        hidden={!layoutVertices}
        className={className}
        render={render}
        renderUtils={renderUtils}
        vertex={vertex}
        layoutVertex={layoutVertices && layoutVertices[i]}
        {...rest}
        {...(setOnItem && setOnItem(vertex, renderUtils, layoutVertices && layoutVertices[i]))}
      />
    ));
  }

  render() {
    const { htmlNodeRefs } = this.state;
    if (htmlNodeRefs) {
      const { classNamePrefix, setOnContainer } = this.props;
      const containerProps = mergeClassNameAndStyle((setOnContainer && setOnContainer(this.props)) || {}, {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
        },
        className: `${classNamePrefix} ${classNamePrefix}-LayeredDirectedGraph--MeasurableNodesLayer`,
      });
      return <div {...containerProps}>{this.renderVertices(htmlNodeRefs)}</div>;
    }
    return null;
  }
}
