// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useEffect } from 'react';

import renderIntoCanvas from './render-into-canvas';
import colorGenerator from '../../../../utils/color-generator';

import './CanvasSpanGraph.css';

type CanvasSpanGraphProps = {
  items: { valueWidth: number; valueOffset: number; serviceName: string }[];
  valueWidth: number;
};

export const getColor = (hex: string) => colorGenerator.getRgbColorByKey(hex);

const CanvasSpanGraph: React.FC<CanvasSpanGraphProps> = ({ items, valueWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderIntoCanvas(canvasRef.current, items, valueWidth, getColor);
    }
  }, [items, valueWidth]);

  return <canvas className="CanvasSpanGraph" ref={canvasRef} />;
};

export default CanvasSpanGraph;
