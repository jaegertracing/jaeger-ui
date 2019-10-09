// Copyright (c) 2019 Uber Technologies, Inc.
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

import _memoize from 'lodash/memoize';

import { FONT, FONT_SIZE, LINE_HEIGHT, OP_PADDING_TOP, WORD_RX } from './constants';

type TRect = { height: number; width: number };

let svcSpan: HTMLSpanElement | undefined;

// exported for tests
export function _initSvcSpan() {
  if (svcSpan) return svcSpan;
  svcSpan = document.createElement('span');
  svcSpan.style.position = 'absolute';
  svcSpan.style.top = `-${FONT_SIZE * LINE_HEIGHT}px`;
  svcSpan.style.fontFamily = FONT;
  svcSpan.style.fontWeight = '500';
  document.body.appendChild(svcSpan);
  return svcSpan;
}

let opSpan: HTMLSpanElement | undefined;

// exported for tests
export function _initOpSpan() {
  if (opSpan) return opSpan;
  opSpan = document.createElement('span');
  opSpan.style.position = 'absolute';
  opSpan.style.top = `-${FONT_SIZE * LINE_HEIGHT}px`;
  opSpan.style.fontFamily = FONT;
  opSpan.style.fontWeight = '500';
  document.body.appendChild(opSpan);
  return opSpan;
}

function calcWidth(lengths: number[], lines: number, longestThusFar: number = 0): number {
  const total = lengths.reduce((sum, curr) => curr + sum, 0);
  if (lines === 1) return total;
  const minRectWidth = Math.max(longestThusFar, total / lines);
  let firstLine = 0;
  let i = 0;
  do {
    firstLine += lengths[i++];
  } while (firstLine + lengths[i] < minRectWidth);

  const firstLineOptions = [{ width: firstLine, start: i }];
  while (lengths.length - i >= lines && firstLineOptions[firstLineOptions.length - 1].width < total / 2) {
    firstLineOptions.push({
      width: firstLineOptions[firstLineOptions.length - 1].width + lengths[i++],
      start: i,
    });
  }
  return Math.min(
    ...firstLineOptions.map(({ width, start }) =>
      Math.max(calcWidth(lengths.slice(start), lines - 1, Math.max(longestThusFar, width)), width)
    )
  );
}

const calcRects = _memoize(function calcRects(str: string, span: HTMLElement): TRect[] {
  const lengths = (str.match(WORD_RX) || [str]).map(s => {
    span.innerHTML = s; // eslint-disable-line no-param-reassign
    return span.getClientRects()[0].width;
  });

  const rects: TRect[] = [];
  for (let lines = 1; lines <= lengths.length; lines++) {
    const width = calcWidth(lengths, lines);
    const height = lines * FONT_SIZE * LINE_HEIGHT;
    if (!rects.length || width < rects[rects.length - 1].width) rects.push({ height, width });
    if (height > width) break;
  }
  return rects;
});

const sq = (n: number): number => n ** 2;
const diagonal = (rect: TRect): number => Math.sqrt(sq(rect.height) + sq(rect.width));

type TSmallestRadiusRV = { radius: number; svcWidth: number; opWidth?: number; svcMarginTop: number };
function smallestRadius(svcRects: TRect[], opRects?: TRect[]): TSmallestRadiusRV {
  if (!opRects) {
    let minRadius = diagonal(svcRects[0]);
    let { width: minWidth } = svcRects[0];
    let { height } = svcRects[0];

    for (let i = 1; i < svcRects.length; i++) {
      const radius = diagonal(svcRects[i]);
      if (radius < minRadius) {
        minRadius = radius;
        minWidth = svcRects[i].width;
        height = svcRects[i].height;
      }
    }

    return {
      radius: minRadius / 2,
      svcWidth: minWidth,
      svcMarginTop: (minRadius - height) / 2,
    };
  }

  let rv: TSmallestRadiusRV | undefined;
  svcRects.forEach(svcRect => {
    opRects.forEach(opRect => {
      let radius;
      let svcMarginTop;
      const totalHeight = svcRect.height + opRect.height + OP_PADDING_TOP;
      const cy = (sq(svcRect.width / 2) - sq(opRect.width / 2)) / (2 * totalHeight) + totalHeight / 2;
      if (cy < opRect.height / 2) {
        radius = diagonal(opRect) / 2;
        svcMarginTop = radius - OP_PADDING_TOP - opRect.height / 2 - svcRect.height;
      } else if (cy > totalHeight - svcRect.height / 2) {
        radius = diagonal(svcRect) / 2;
        svcMarginTop = radius - svcRect.height / 2;
      } else {
        radius = Math.sqrt(sq(opRect.width / 2) + sq(cy));
        svcMarginTop = radius - totalHeight + cy;
      }

      if (!rv || rv.radius > radius) {
        rv = { radius, svcWidth: svcRect.width, opWidth: opRect.width, svcMarginTop };
      }
    });
  });

  /* istanbul ignore next ; Unreachable error to appease TS */
  if (!rv) throw new Error('Given 0 svcRects and/or 0 opRects');
  return rv;
}

const calcPositioning = _memoize(
  function calcPositioningImpl(service: string, operation?: string | null) {
    const svcRects = calcRects(service, _initSvcSpan());
    const opRects = operation ? calcRects(operation, _initOpSpan()) : undefined;

    return smallestRadius(svcRects, opRects);
  },
  (service: string, operation?: string | null) => `${service}-----${operation}`
);

export default calcPositioning;
