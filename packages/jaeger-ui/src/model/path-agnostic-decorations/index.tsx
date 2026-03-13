// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import queryString from 'query-string';

import CircularProgressbar from '../../components/common/CircularProgressbar';
import {
  PROGRESS_BAR_STROKE_WIDTH,
  RADIUS,
} from '../../components/DeepDependencies/Graph/DdgNodeContent/constants';
import { ReduxState } from '../../types/index';

export type TDecorationFromState = {
  decorationID?: string;
  decorationProgressbar?: React.ReactNode;
  decorationValue?: string | number;
};

export default function extractDecorationFromState(
  state: ReduxState,
  {
    service,
    operation,
    search = '',
  }: { service: string; operation?: string | string[] | null; search?: string }
): TDecorationFromState {
  const { decoration } = queryString.parse(search);
  const decorationID = Array.isArray(decoration) ? decoration[0] : decoration;

  if (!decorationID) return {};

  const operationKey = String(operation);
  let decorationValue = state.pathAgnosticDecorations?.[decorationID]?.withOp?.[service]?.[operationKey];
  let decorationMax = state.pathAgnosticDecorations?.[decorationID]?.withOpMax;
  if (!decorationValue) {
    decorationValue = state.pathAgnosticDecorations?.[decorationID]?.withoutOp?.[service];
    decorationMax = state.pathAgnosticDecorations?.[decorationID]?.withoutOpMax;
  }

  const decorationProgressbar =
    typeof decorationValue === 'number' ? (
      <CircularProgressbar
        key={`${service}\t${operation}`}
        backgroundHue={120}
        decorationHue={0}
        maxValue={decorationMax as unknown as number}
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
