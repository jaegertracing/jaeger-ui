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

import _minBy from 'lodash/minBy';
import _memoize from 'lodash/memoize';

import { /* CURVED_BORDER_THICKNESS, */ FONT, FONT_SIZE, LINE_HEIGHT, OP_PADDING_TOP, WORD_RX } from './constants';


// TODO move to other file, major clean up, MEMOIZE makes it fast enough:
/*
const measureSvc: (str: string) => TextMetrics = (function makeCanvas() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = HEAVY_FONT;
  return ctx.measureText;
})();

const measureOp: (str: string) => TextMetrics = (function makeCanvas() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = FONT;
  return ctx.measureText;
})();
 */

// const measured: Record<string, number> = {};
const svcSpan = document.createElement('svcSpan');
svcSpan.style.position = 'absolute';
svcSpan.style.top = `-${FONT_SIZE * LINE_HEIGHT}px`;
svcSpan.style.fontSize = `${FONT_SIZE}px`;
svcSpan.style.fontFamily = FONT;
svcSpan.style.fontWeight = '500';
document.body.appendChild(svcSpan);

/*
const measureSvc = (str: string): number => {
  svcSpan.innerHTML = str;
  // measured[str] = svcSpan.getClientRects()[0].width;
  // return svcSpan.getClientRects()[0].width;
  // TODO: investigate why: for some reason this calculation is consistently ~.015-.03 pixels too low
  return svcSpan.getClientRects()[0].width + 0.5;
};
*/

const opSpan = document.createElement('opSpan');
opSpan.style.position = 'absolute';
opSpan.style.top = `-${FONT_SIZE * LINE_HEIGHT}px`;
opSpan.style.fontSize = `${FONT_SIZE}px`;
opSpan.style.fontFamily = FONT;
document.body.appendChild(opSpan);

/*
const measureOp = (str: string): number => {
  opSpan.innerHTML = str;
  // measured[str] = opSpan.getClientRects()[0].width;
  return opSpan.getClientRects()[0].width;
};
 */

// (window as any).measureSvc = measureSvc;
// (window as any).measureOp = measureOp;
// (window as any).measured = measured;

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
    firstLineOptions.push({ width: firstLineOptions[firstLineOptions.length - 1].width + lengths[i++], start: i });
  }
  return Math.min(...firstLineOptions.map(({ width, start }) => Math.max(calcWidth(lengths.slice(start), lines - 1, Math.max(longestThusFar, width)), width)));
}

type TRect = { height: number, width: number };

const calcRects = _memoize(function calcRects(s: string, span: HTMLElement): TRect[] {
  const lengths = (s.match(WORD_RX) || [s]).map(str => {
    span.innerHTML = str; // eslint-disable-line no-param-reassign
    // TODO: investigate why this calculation is consistently ~.015-.03 pixels too low for services
    const { width } = span.getClientRects()[0]
    return span === svcSpan ? width + 0.5 : width;
  });

  const rects: TRect[] = [];
  for(let lines = 1; lines <= lengths.length; lines++) {
    const width = calcWidth(lengths, lines);
    const height = lines * FONT_SIZE * LINE_HEIGHT;
    if (!rects.length || width < rects[rects.length - 1].width) rects.push({ height, width });
    if (height > width) break;
  }
  return rects;
});

const sq = (n: number): number => n ** 2;
const diagonal = (rect: TRect): number => Math.sqrt(sq(rect.height) + sq(rect.width));

type TSmallestRadiusRV = { radius: number, svcWidth: number, opWidth?: number, svcMarginTop: number };
function smallestRadius(svcRects: TRect[], opRects?: TRect[]): TSmallestRadiusRV {
  if (!opRects) {
    let minRadius = diagonal(svcRects[0]);
    let { width: minWidth } = svcRects[0];
    let { height } = svcRects[0];

    for (let i = 1; i < svcRects.length; i++) {
      const radius = diagonal(svcRects[i]);
      if (!minRadius || radius < minRadius) {
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

  const options: TSmallestRadiusRV[] = [];
  svcRects.forEach(svcRect => {
    opRects.forEach(opRect => {
      let radius;
      let svcMarginTop;
      const totalHeight = svcRect.height + opRect.height + OP_PADDING_TOP;
      const cy = (sq(svcRect.width / 2) - sq(opRect.width / 2)) / (2 * totalHeight) + totalHeight / 2;
      if (cy < opRect.height / 2) {
        // console.log('using op');
        radius = diagonal(opRect) / 2;
        svcMarginTop = radius - OP_PADDING_TOP - opRect.height / 2 - svcRect.height; // TODO margin top
      } else if (cy > totalHeight - svcRect.height / 2) {
        radius = diagonal(svcRect) / 2;
        // console.log('using svc');
        svcMarginTop = radius - svcRect.height / 2;
      } else {
        radius = Math.sqrt(sq(opRect.width / 2) + sq(cy));
        // console.log('using calc');
        svcMarginTop = radius - totalHeight + cy;
      }
      // console.log(cy, totalHeight, radius, opRect.width, opRect.height, svcRect.width, svcRect.height);
      options.push({ radius, svcWidth: svcRect.width, opWidth: opRect.width, svcMarginTop });
    });
  });
  // console.log(options);

  // TODO cast shouldn't be necessary, also maybe calc in double for each loop
  return _minBy(options, 'radius') as TSmallestRadiusRV;
}

// let count = 0;
const calcPositioning = _memoize(function calcPositioningImpl(service: string, operation?: string | null) {
  // console.log(count++);
  const svcRects = calcRects(service, svcSpan);
  let opRects: TRect[] | undefined;

  if (operation) {
    opRects = calcRects(operation, opSpan);
    // console.log(svcLen, svcRects, opLen, opRects);
  }

  return smallestRadius(svcRects, opRects);
}, (service: string, operation?: string | null) => `${service}-----${operation}`);

export default calcPositioning;
