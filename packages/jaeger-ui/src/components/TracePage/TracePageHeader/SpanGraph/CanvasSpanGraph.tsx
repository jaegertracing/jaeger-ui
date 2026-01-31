// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useEffect } from 'react';

import renderIntoCanvas from './render-into-canvas';
import colorGenerator from '../../../../utils/color-generator';
import { useThemeMode } from '../../../App/ThemeProvider';

import './CanvasSpanGraph.css';

type CanvasSpanGraphProps = {
  items: { valueWidth: number; valueOffset: number; serviceName: string }[];
  valueWidth: number;
};

export const getColor = (hex: string) => colorGenerator.getRgbColorByKey(hex);

const CanvasSpanGraph: React.FC<CanvasSpanGraphProps> = ({ items, valueWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mode } = useThemeMode();

  useEffect(() => {
    if (canvasRef.current) {
      const backgroundColor = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--surface-primary')
        .trim();
      renderIntoCanvas(canvasRef.current, items, valueWidth, getColor, backgroundColor || undefined);
    }
  }, [items, valueWidth, mode]);

  return <canvas className="CanvasSpanGraph" ref={canvasRef} />;
};

export default CanvasSpanGraph;
