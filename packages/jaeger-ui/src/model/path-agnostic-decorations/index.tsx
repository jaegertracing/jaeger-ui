// Copyright (c) 2020 Uber Technologies, Inc.
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

import * as React from 'react';
import _get from 'lodash/get';
import queryString from 'query-string';
import { CircularProgressbar } from 'react-circular-progressbar';

import {
  PROGRESS_BAR_STROKE_WIDTH,
  RADIUS,
} from '../../components/DeepDependencies/Graph/DdgNodeContent/constants';
import { ReduxState } from '../../types/index';
import { TDdgVertex } from '../ddg/types';

import 'react-circular-progressbar/dist/styles.css';

export type TDecorationFromState = {
  decorationID?: string;
  decorationProgressbar?: React.ReactNode;
  decorationValue?: string | number;
};

export default function extractDecorationFromState(
  state: ReduxState,
  { service, operation }: { service: string; operation?: string | string[] | null }
): TDecorationFromState {
  const { decoration } = queryString.parse(state.router.location.search);
  const decorationID = Array.isArray(decoration) ? decoration[0] : decoration;

  if (!decorationID) return {};

  let decorationValue = _get(
    state,
    `pathAgnosticDecorations.${decorationID}.withOp.${service}.${operation}`
  );
  let decorationMax = _get(state, `pathAgnosticDecorations.${decorationID}.withOpMax`);
  if (!decorationValue) {
    decorationValue = _get(state, `pathAgnosticDecorations.${decorationID}.withoutOp.${service}`);
    decorationMax = _get(state, `pathAgnosticDecorations.${decorationID}.withoutOpMax`);
  }

  const scale = Math.pow(decorationValue / decorationMax, 1 / 4);
  const saturation = Math.ceil(scale * 100);
  const light = 50 + Math.ceil((1 - scale) * 50);
  const decorationColor = `hsl(0, ${saturation}%, ${light}%)`;
  const backgroundScale = Math.pow((decorationMax - decorationValue) / decorationMax, 1 / 4);
  const backgroundSaturation = Math.ceil(backgroundScale * 100);
  const backgroundLight = 50 + Math.ceil((1 - backgroundScale) * 50);
  const decorationBackgroundColor = `hsl(120, ${backgroundSaturation}%, ${backgroundLight}%)`;

  const decorationProgressbar =
    typeof decorationValue === 'number' ? (
      <CircularProgressbar
        key={`${service}\t${operation}`}
        styles={{
          path: {
            stroke: decorationColor,
            strokeLinecap: 'butt',
          },
          text: {
            fill: decorationColor,
          },
          trail: {
            stroke: decorationBackgroundColor,
            strokeLinecap: 'butt',
          },
        }}
        maxValue={decorationMax}
        strokeWidth={(PROGRESS_BAR_STROKE_WIDTH / RADIUS) * 50}
        text={`${decorationValue}`}
        value={decorationValue}
      />
    ) : (
      undefined
    );

  return {
    decorationProgressbar,
    decorationID,
    decorationValue,
  };
}
