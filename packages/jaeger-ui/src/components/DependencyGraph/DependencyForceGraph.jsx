// Copyright (c) 2017 Uber Technologies, Inc.
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

import React, { useState, useEffect, useMemo } from 'react';
import { InteractiveForceGraph, ForceGraphNode } from 'react-vis-force';
import { window } from 'global';
import debounce from 'lodash/debounce';
import ForceGraphArrowLink from './ForceGraphArrowLink';
import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';

// export for tests
export const chargeStrength = ({ radius = 5, orphan }) => (orphan ? -20 * radius : -12 * radius);

const DependencyForceGraph = ({ nodes, links }) => {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);
  const container = React.useRef(null);

  useEffect(() => {
    const onResize = () => {
      setWidth(window.innerWidth);
      setHeight(container.current ? window.innerHeight - container.current.offsetTop : window.innerHeight);
    };

    const debouncedResize = debounce(onResize, 50);
    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  const nodesMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  return (
    <div ref={container} style={{ position: 'relative' }}>
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
        {nodes.map(({ labelStyle, labelClass, showLabel, opacity, fill, ...node }) => (
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
          <ForceGraphArrowLink
            key={`${link.source}=>${link.target}`}
            opacity={opacity}
            link={link}
            targetRadius={nodesMap.get(link.target).radius}
          />
        ))}
      </InteractiveForceGraph>
    </div>
  );
};

DependencyForceGraph.propTypes = {
  nodes: nodesPropTypes.isRequired,
  links: linksPropTypes.isRequired,
};

export default DependencyForceGraph;
