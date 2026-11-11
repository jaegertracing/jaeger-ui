// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import CircularProgressbar from '../../components/common/CircularProgressbar';
import {
  PROGRESS_BAR_STROKE_WIDTH,
  RADIUS,
} from '../../components/DeepDependencies/Graph/DdgNodeContent/constants';

export type TDecoration = {
  decorationID?: string;
  decorationProgressbar?: React.ReactNode;
  decorationValue?: string | number;
};

export default function getDecorationPresentation({
  service,
  operation,
  decorationID,
  decorationValue,
  decorationMax,
}: {
  service: string;
  operation?: string | string[] | null;
  decorationID?: string;
  decorationValue?: string | number;
  decorationMax?: number;
}): TDecoration {
  if (!decorationID) return {};

  const decorationProgressbar =
    typeof decorationValue === 'number' ? (
      <CircularProgressbar
        key={`${service}\t${operation}`}
        backgroundHue={120}
        decorationHue={0}
        maxValue={decorationMax ?? decorationValue}
        strokeWidth={(PROGRESS_BAR_STROKE_WIDTH / RADIUS) * 50}
        text={`${decorationValue}`}
        value={decorationValue}
      />
    ) : undefined;

  return {
    decorationProgressbar,
    decorationID,
    decorationValue,
  };
}
