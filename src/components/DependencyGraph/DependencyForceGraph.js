// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, { Component } from 'react';
import {
  InteractiveForceGraph,
  ForceGraphNode,
  ForceGraphLink,
} from 'react-vis-force';
import { window } from 'global';
import { debounce } from 'lodash';

import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';

const chargeStrength = ({ radius = 5, orphan }) =>
  orphan ? -20 * radius : -12 * radius;

export default class DependencyForceGraph extends Component {
  static get propTypes() {
    return {
      nodes: nodesPropTypes.isRequired,
      links: linksPropTypes.isRequired,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      width: window.innerWidth,
      height: window.innerHeight,
      top: 0,
      left: 0,
    };
  }

  componentDidMount() {
    this.onResize();
    this.debouncedResize = debounce((...args) => this.onResize(...args), 50);
    window.addEventListener('resize', this.debouncedResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.debouncedResize);
  }

  onResize() {
    const width = window.innerWidth;
    let height = window.innerHeight;
    if (this.container) {
      height -= this.container.offsetTop;
    }

    this.setState({ width, height });
  }

  render() {
    const { nodes, links } = this.props;
    const { width, height } = this.state;

    return (
      <div
        ref={/* istanbul ignore next */ c => {
          this.container = c;
        }}
        style={{ position: 'relative' }}
      >
        <InteractiveForceGraph
          zoom
          minScale={1 / 2}
          maxScale={4}
          panLimit={2}
          simulationOptions={{
            width,
            height,
            strength: {
              charge: chargeStrength,
              x: width / height > 1 ? 0.1 : 0.12,
              y: width / height < 1 ? 0.1 : 0.12,
            },
          }}
          labelOffset={{
            x: ({ radius }) => radius + 2,
            y: ({ radius }) => radius / 2,
          }}
          nodeAttrs={['orphan']}
          highlightDependencies
        >
          {nodes.map(({
            labelStyle,
            labelClass,
            showLabel,
            opacity,
            fill,
            ...node
          }) => (
            <ForceGraphNode
              key={node.id}
              node={node}
              labelStyle={labelStyle}
              labelClass={labelClass}
              showLabel={showLabel}
              opacity={opacity}
              fill={fill}
            />
          ))}
          {links.map(({ opacity, ...link }) => (
            <ForceGraphLink
              key={`${link.source}=>${link.target}`}
              opacity={opacity}
              link={link}
            />
          ))}
        </InteractiveForceGraph>
      </div>
    );
  }
}
