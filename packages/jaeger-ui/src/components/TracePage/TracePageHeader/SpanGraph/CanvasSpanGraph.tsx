// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useEffect, useState } from 'react';

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
  const [theme, setTheme] = useState(() => document.body.getAttribute('data-theme'));

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.body.getAttribute('data-theme'));
        }
      });
    });
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      renderIntoCanvas(canvasRef.current, items, valueWidth, getColor);
    }
  }, [items, valueWidth, theme]);

  return <canvas className="CanvasSpanGraph" ref={canvasRef} />;
};

export default CanvasSpanGraph;
