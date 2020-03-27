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

import _get from 'lodash/get';
import queryString from 'query-string';

import { ReduxState } from '../../types/index';
import {
  TDdgVertex,
} from '../ddg/types';

export type TDecorationFromState = {
  decorationColor?: string;
  decorationID?: string;
  decorationValue?: string | number;
  decorationMax?: number;
};

export default function extractDecorationFromState(state: ReduxState, { service, operation }: { service: string, operation?: string | string[] | null }): TDecorationFromState {
  const { decoration } = queryString.parse(state.router.location.search);
  const decorationID = Array.isArray(decoration) ? decoration[0] : decoration;

  if (!decorationID) return {};

  let decorationValue = _get(state, `pathAgnosticDecorations.${decorationID}.withOp.${service}.${operation}.value`);
  let decorationMax = _get(state, `pathAgnosticDecorations.${decorationID}.withOpMax`);
  if (!decorationValue) {
    decorationValue = _get(state, `pathAgnosticDecorations.${decorationID}.withoutOp.${service}.value`);
    decorationMax = _get(state, `pathAgnosticDecorations.${decorationID}.withoutOpMax`);
  }

    /*
  const red = Math.ceil(decorationValue / decorationMax * 255);
  const decorationColor = `rgb(${red}, 0, 0)`
     */
  // const saturation = Math.ceil(Math.pow(decorationValue / decorationMax, 1 / 2) * 100);
  // const decorationColor = `hsl(0, ${saturation}%, 50%)`;
  const scale = Math.pow(decorationValue / decorationMax, 1 / 4);
  const saturation = Math.ceil(scale * 100);
  const light = 50 + Math.ceil((1 - scale) * 50);
  const decorationColor = `hsl(0, ${saturation}%, ${light}%)`;
  //  const decorationColor = `hsl(0, 100%, ${light}%)`;


  return { decorationColor, decorationID, decorationValue, decorationMax };
}
