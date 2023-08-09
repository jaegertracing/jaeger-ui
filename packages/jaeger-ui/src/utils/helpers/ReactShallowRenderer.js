// Copyright (c) 2020 Uber Technologies, Inc.
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

import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { isFragment, isLazy, isPortal, isMemo, isSuspense, isForwardRef } from 'react-is';

class ReactShallowRenderer {
  instance = null;
  shallowRenderer = null;
  constructor(children, { Wrapper = null } = {}) {
    this.shallowRenderer = new ShallowRenderer();
    this.shallowWrapper = Wrapper
      ? this.shallowRenderer.render(<Wrapper>{children}</Wrapper>)
      : this.shallowRenderer.render(children);
  }

  getRenderOutput() {
    if (!this.shallowWrapper) return this.shallowWrapper;
    const getNodeName = node => {
      return node.displayName || node.name || '';
    };

    const getWrappedName = (outerNode, innerNode, wrapperName) => {
      const functionName = getNodeName(innerNode);
      return (
        outerNode.type.displayName || (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
      );
    };

    const extractType = node => {
      if (typeof node === 'string') return node;
      const name = getNodeName(node.type) || node.type || 'Component';
      if (isLazy(node)) {
        return 'Lazy';
      }

      if (isMemo(node)) {
        return `Memo(${name || extractType(node.type)})`;
      }

      if (isSuspense(node)) {
        return 'Suspense';
      }

      if (isPortal(node)) {
        return 'Portal';
      }

      if (isFragment(node)) {
        return 'Fragment';
      }
      if (isForwardRef(node)) {
        return getWrappedName(node, node.type.render, 'ForwardRef');
      }
      return name;
    };

    const transformNode = node => {
      const extractProps = ({ children, ...props } = {}, key) => {
        const childrenArray = Array.isArray(children) ? children : [children];
        return {
          children: childrenArray.filter(Boolean).flatMap(transformNode),
          props: {
            ...props,
            ...(key ? { key } : {}),
          },
        };
      };
      if (Array.isArray(node)) {
        return node.map(transformNode);
      }
      if (typeof node !== 'object') {
        return node;
      }
      return {
        // this symbol is used by Jest to prettify serialized React test objects: https://github.com/facebook/jest/blob/e0b33b74b5afd738edc183858b5c34053cfc26dd/packages/pretty-format/src/plugins/ReactTestComponent.ts
        $$typeof: Symbol.for('react.test.json'),
        type: extractType(node),
        ...extractProps(node.props, node.key),
      };
    };

    return transformNode(this.shallowWrapper);
  }
}

export default ReactShallowRenderer;
