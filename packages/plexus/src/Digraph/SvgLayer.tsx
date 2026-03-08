// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import SvgDefEntry from './SvgDefEntry';
import { TSetOnContainer, TExposedGraphState, TDefEntry } from './types';
import { assignMergeCss, getProps } from './utils';
import TNonEmptyArray from '../types/TNonEmptyArray';
import ZoomManager from '../zoom/ZoomManager';

type TProps<T = {}, U = {}> = Record<string, unknown> &
  TSetOnContainer<T, U> & {
    classNamePart: string;
    getClassName: (name: string) => string;
    defs?: TNonEmptyArray<TDefEntry<T, U>>;
    extraWrapper?: Record<string, unknown>;
    graphState: TExposedGraphState<T, U>;
    standalone?: boolean;
    topLayer?: boolean;
    children: React.ReactNode;
  };

const STYLE: React.CSSProperties = {
  left: 0,
  minHeight: '100%',
  minWidth: '100%',
  position: 'absolute',
  top: 0,
};

const SvgLayer = <T = {}, U = {}>(props: TProps<T, U>) => {
  const {
    children,
    classNamePart,
    getClassName,
    defs,
    extraWrapper,
    graphState,
    setOnContainer,
    standalone,
    topLayer,
  } = props;

  const containerProps = assignMergeCss(
    {
      className: getClassName(classNamePart),
    },
    getProps(setOnContainer, graphState)
  );

  let content = (
    <g {...containerProps}>
      {defs && (
        <defs>
          {defs.map(defEntry => (
            <SvgDefEntry<T, U>
              key={defEntry.localId}
              {...defEntry}
              getClassName={getClassName}
              graphState={graphState}
            />
          ))}
        </defs>
      )}
      {children}
    </g>
  );

  if (extraWrapper) {
    content = <g {...extraWrapper}>{content}</g>;
  }

  if (!standalone && !topLayer) {
    return content;
  }

  const { zoomTransform } = graphState;
  return (
    <svg className={getClassName('SvgLayer')} style={STYLE}>
      <g className={getClassName('SvgLayer--transformer')} transform={ZoomManager.getZoomAttr(zoomTransform)}>
        {content}
      </g>
    </svg>
  );
};

export default React.memo(SvgLayer) as typeof SvgLayer;
