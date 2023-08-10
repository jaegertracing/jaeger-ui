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

/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { isFragment, isLazy, isPortal, isMemo, isSuspense, isForwardRef } from 'react-is';

const shallow = (element, options) => {
  const localOptions = options === undefined ? {} : options;
  const Wrapper = localOptions.Wrapper || null;
  const shallowRenderer = new ShallowRenderer();
  const shallowWrapper = Wrapper
    ? shallowRenderer.render(<Wrapper>{element}</Wrapper>)
    : shallowRenderer.render(element);

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

  const transformNode = current => {
    const extractProps = ({ children, ...props }, key) => {
      const childrenArray = Array.isArray(children) ? children : [children];
      return {
        children: childrenArray.filter(Boolean).map(transformNode),
        props: {
          ...props,
          ...(key ? { key } : {}),
        },
      };
    };
    if (Array.isArray(current)) {
      return current.map(transformNode);
    }
    if (typeof current !== 'object') {
      return current;
    }
    return {
      $$typeof: Symbol.for('react.test.json'),
      type: extractType(current),
      ...extractProps(current.props, current.key),
    };
  };

  return transformNode(shallowWrapper);
};

export default shallow;
