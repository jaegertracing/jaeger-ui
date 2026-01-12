// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { TSetOnContainer, TExposedGraphState } from './types';
import { assignMergeCss, getProps } from './utils';
import ZoomManager from '../zoom/ZoomManager';

type TProps<T = {}, U = {}> = Record<string, unknown> &
  TSetOnContainer<T, U> & {
    classNamePart: string;
    getClassName: (name: string) => string;
    graphState: TExposedGraphState<T, U>;
    standalone?: boolean;
    topLayer?: boolean;
    children: React.ReactNode;
  };

const STYLE: React.CSSProperties = { left: 0, position: 'absolute', top: 0 };

const HtmlLayer = <T = {}, U = {}>({
  children,
  classNamePart,
  getClassName,
  graphState,
  setOnContainer,
  standalone,
  topLayer,
}: TProps<T, U>) => {
  const { zoomTransform } = graphState;
  const zoomStyle = { style: topLayer || standalone ? ZoomManager.getZoomStyle(zoomTransform) : {} };
  const containerProps = assignMergeCss(
    {
      className: getClassName(classNamePart),
      style: STYLE,
    },
    zoomStyle,
    getProps(setOnContainer, graphState)
  );

  return <div {...containerProps}>{children}</div>;
};

export default React.memo(HtmlLayer) as typeof HtmlLayer;
