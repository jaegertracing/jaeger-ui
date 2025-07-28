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
