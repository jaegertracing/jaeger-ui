// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { TQualityMetrics } from './types';

import './BannerText.css';

export type TProps = {
  bannerText: TQualityMetrics['bannerText'];
};

const BannerText: React.FC<TProps> = ({ bannerText }) => {
  if (!bannerText) return null;

  const { styling = undefined, value: text } =
    typeof bannerText === 'object' ? bannerText : { value: bannerText };

  return (
    <div className="BannerText" style={styling}>
      {text}
    </div>
  );
};

export default React.memo(BannerText);
