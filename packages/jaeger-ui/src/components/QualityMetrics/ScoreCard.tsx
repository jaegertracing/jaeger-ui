// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import CircularProgressbar from '../common/CircularProgressbar';
import NewWindowIcon from '../common/NewWindowIcon';

import { TQualityMetrics } from './types';

import './ScoreCard.css';

export type TProps = {
  link: string;
  score: TQualityMetrics['scores'][0];
};

const ScoreCard: React.FC<TProps> = ({ link, score }) => {
  const { label, max: maxValue, value } = score;
  const linkText = value < maxValue ? 'How to improve ' : 'Great! What does this mean ';
  return (
    <div className="ScoreCard">
      <span className="ScoreCard--TitleHeader">{label}</span>
      <div className="ScoreCard--CircularProgressbarWrapper">
        <CircularProgressbar
          backgroundHue={value === 0 ? 0 : undefined}
          decorationHue={120}
          maxValue={maxValue}
          text={`${((value / maxValue) * 100).toFixed(1)}%`}
          value={value}
        />
      </div>
      <a href={link} target="_blank" rel="noreferrer noopener">
        {linkText}
        <NewWindowIcon />
      </a>
    </div>
  );
};

export default React.memo(ScoreCard);
