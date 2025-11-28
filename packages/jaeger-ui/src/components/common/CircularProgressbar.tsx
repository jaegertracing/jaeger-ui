// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { CircularProgressbar as CircularProgressbarImpl } from 'react-circular-progressbar';

import 'react-circular-progressbar/dist/styles.css';

type TProps = {
  backgroundHue?: number;
  decorationHue?: number;
  maxValue: number;
  strokeWidth?: number;
  text?: string;
  value: number;
};

const CircularProgressbar: React.FC<TProps> = ({
  backgroundHue,
  decorationHue = 0,
  maxValue,
  strokeWidth,
  text,
  value,
}) => {
  const scale = (value / maxValue) ** (1 / 4);
  const saturation = 20 + Math.ceil(scale * 80);
  const light = 50 + Math.ceil((1 - scale) * 30);
  const decorationColor = `hsl(${decorationHue}, ${saturation}%, ${light}%)`;
  const backgroundScale = ((maxValue - value) / maxValue) ** (1 / 4);
  const backgroundSaturation = 20 + Math.ceil(backgroundScale * 80);
  const backgroundLight = 50 + Math.ceil((1 - backgroundScale) * 30);
  const decorationBackgroundColor = `hsl(${backgroundHue}, ${backgroundSaturation}%, ${backgroundLight}%)`;

  return (
    <div data-testid="circular-progress-bar">
      <CircularProgressbarImpl
        styles={{
          path: {
            stroke: decorationColor,
            strokeLinecap: 'butt',
          },
          text: {
            fill: decorationColor,
          },
          trail: {
            stroke: backgroundHue !== undefined ? decorationBackgroundColor : 'transparent',
            strokeLinecap: 'butt',
          },
        }}
        maxValue={maxValue}
        strokeWidth={strokeWidth}
        text={text}
        value={value}
      />
    </div>
  );
};

export default CircularProgressbar;
