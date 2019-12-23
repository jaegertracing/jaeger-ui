// Copyright (c) 2018 The Jaeger Authors.
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

import { ITableSpan } from './types';

/**
 * Generates the background color according to the percentage.
 */
export default function generateColor(allSpans: ITableSpan[], colorToPercent: boolean) {
  const allSpans2 = allSpans;
  let color;
  let colorString;
  for (let i = 0; i < allSpans.length; i++) {
    if (colorToPercent) {
      if (allSpans[i].isDetail) {
        if (allSpans[i].percent < 40) {
          color = 236 - 80 * (allSpans[i].percent / 100);
        } else {
          color = 236 - 166 * (allSpans[i].percent / 100);
        }
        colorString = `rgb(248,${color},${color})`;
        allSpans2[i].colorToPercent = colorString;
      }
    } else {
      allSpans2[i].colorToPercent = `rgb(248,248,248)`;
    }
  }
}
