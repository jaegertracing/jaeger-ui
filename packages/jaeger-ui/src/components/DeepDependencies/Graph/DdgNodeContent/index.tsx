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

import * as React from 'react';
import cx from 'classnames';
import _minBy from 'lodash/minBy';
import { TMeasureNodeUtils, TRendererUtils } from '@jaegertracing/plexus/lib/Digraph/types';
import { TLayoutVertex, TVertex } from '@jaegertracing/plexus/lib/types';

import calcPositioning from './calc-positioning';
import { focalNodeIcon, setFocusIcon } from './node-icons';
import { getUrl } from '../../url';
import BreakableText from '../../../common/BreakableText';
import NewWindowIcon from '../../../common/NewWindowIcon';
import { getUrl as getSearchUrl } from '../../../SearchTracePage/url';
import { EDdgDensity, EViewModifier, TDdgVertex, PathElem } from '../../../../model/ddg/types';

import './index.css';

type TProps = {
  focalNodeUrl: string | null;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  isFocalNode: boolean;
  isPositioned: boolean;
  operation: string | null;
  service: string;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, isEnabled: boolean) => void;
  vertexKey: string;
};

// While browsers suport URLs of unlimited length, many server clients do not handle more than this max
const MAX_LENGTH = 2083;
const MAX_LINKED_TRACES = 35;
const MIN_LENGTH = getSearchUrl().length;
const PARAM_NAME_LENGTH = '&traceID='.length;

// A border radius of 1px has a maximum horizontal/vertical thickness of Math.sqrt(2). Double for both sides.
const CURVED_BORDER_THICKNESS = 2 * Math.sqrt(2);
const FONT_SIZE = 14;
const LINE_HEIGHT = 1.5;
// const FONT = `${FONT_SIZE}px Helvetica Nueue`;
const FONT = `${FONT_SIZE}px Helvetica Nueue`;
const HEAVY_FONT = `500 ${FONT}`;

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

const measureSvc = (str: string): number => {
  svcSpan.innerHTML = str;
  // measured[str] = svcSpan.getClientRects()[0].width;
  // return svcSpan.getClientRects()[0].width;
  // TODO: investigate why: for some reason this calculation is consistently ~.015-.03 pixels too low
  return svcSpan.getClientRects()[0].width + 0.5;
};

const opSpan = document.createElement('opSpan');
opSpan.style.position = 'absolute';
opSpan.style.top = `-${FONT_SIZE * LINE_HEIGHT}px`;
opSpan.style.fontSize = `${FONT_SIZE}px`;
opSpan.style.fontFamily = FONT;
document.body.appendChild(opSpan);

const measureOp = (str: string): number => {
  opSpan.innerHTML = str;
  // measured[str] = opSpan.getClientRects()[0].width;
  return opSpan.getClientRects()[0].width;
};

(window as any).measureSvc = measureSvc;
(window as any).measureOp = measureOp;
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

function calcRects(lengths: number[]): TRect[] {
  const rects: TRect[] = [];
  for(let lines = 1; lines <= lengths.length; lines++) {
    const width = calcWidth(lengths, lines);
    const height = lines * FONT_SIZE * LINE_HEIGHT;
    if (!rects.length || width < rects[rects.length - 1].width) rects.push({ height, width });
    if (height > width) break;
  }
  return rects;
}

const sq = (n: number): number => n ** 2;
const diagonal = (rect: TRect): number => Math.sqrt(sq(rect.height) + sq(rect.width));

const OP_PADDING_TOP = 5; // might be margin?

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

  // TODO shouldn't be necessary, also maybe calc in double for each loop
  return _minBy(options, 'radius') as TSmallestRadiusRV;
}

const WORD_RX = /\W*\w+\W*/g;

const map: Map<string, TSmallestRadiusRV> = new Map();

export default class DdgNodeContent extends React.PureComponent<TProps> {
  static measureNode(vertex: TVertex<TDdgVertex> /* , utils: TMeasureNodeUtils */) {
    /*
    const log = console.log;
    if (vertex.operation !== '/') console.log = () => {};
    console.log(vertex);
    */

    /*
    const svcLen = (vertex.service.match(WORD_RX) || [vertex.service]).map(measureSvc);
    const svcRects = calcRects(svcLen);
    let opRects: TRect[] | undefined;

    if (vertex.operation) {
      const opLen = (vertex.operation.match(WORD_RX) || [vertex.operation]).map(measureOp);
      opRects = calcRects(opLen);
      // console.log(svcLen, svcRects, opLen, opRects);
    }
    */

    const rv = calcPositioning(vertex.service, vertex.operation);
    // console.log = log;
    map.set(vertex.key, rv);

    const diameter = 2 * (rv.radius + CURVED_BORDER_THICKNESS);
    return {
      height: diameter,
      width: diameter,
    }
  }

  static getNodeRenderer(
    getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined,
    setViewModifier: (vertexKey: string, viewModifier: EViewModifier, enable: boolean) => void,
    density: EDdgDensity,
    showOp: boolean
  ) {
    return function renderNode(vertex: TDdgVertex, utils: TRendererUtils, lv: TLayoutVertex<any> | null) {
      const { isFocalNode, key, operation, service } = vertex;
      return (
        <DdgNodeContent
          focalNodeUrl={isFocalNode ? null : getUrl({ density, operation, service, showOp })}
          getVisiblePathElems={getVisiblePathElems}
          isFocalNode={isFocalNode}
          isPositioned={Boolean(lv)}
          operation={operation}
          setViewModifier={setViewModifier}
          service={service}
          vertexKey={key}
        />
      );
    };
  }

  private viewTraces = () => {
    const { vertexKey, getVisiblePathElems } = this.props;
    const elems = getVisiblePathElems(vertexKey);
    if (elems) {
      const ids: Set<string> = new Set();
      let currLength = MIN_LENGTH;
      for (let i = 0; i < elems.length; i++) {
        const id = elems[i].memberOf.traceID;
        if (ids.has(id)) {
          continue;
        }
        // Keep track of the length, then break if it is too long, to avoid opening a tab with a URL that the
        // backend cannot process, even if there are more traceIDs
        currLength += PARAM_NAME_LENGTH + id.length;
        if (currLength > MAX_LENGTH) {
          break;
        }
        ids.add(id);
        if (ids.size >= MAX_LINKED_TRACES) {
          break;
        }
      }
      window.open(getSearchUrl({ traceID: Array.from(ids) }), '_blank');
    }
  };

  private onMouseUx = (event: React.MouseEvent<HTMLElement>) => {
    const { vertexKey, setViewModifier } = this.props;
    setViewModifier(vertexKey, EViewModifier.Hovered, event.type === 'mouseover');
  };

  render() {
    const { focalNodeUrl, isFocalNode, isPositioned, operation, service } = this.props;
    // const { svcWidth = 30, opWidth = 40, svcMarginTop = '1px' } = map.get(vertexKey) || {};
    // console.log(map.get(vertexKey));
    const { svcWidth, opWidth, svcMarginTop } = calcPositioning(service, operation);
    return (
      <div className="DdgNodeContent" onMouseOver={this.onMouseUx} onMouseOut={this.onMouseUx}>
        <div
          className={cx('DdgNodeContent--core', {
            'is-focalNode': isFocalNode,
            'is-positioned': isPositioned,
          })}
        >
          <div className="DdgNode--test-classname">
            <h4 className="DdgNodeContent--label" style={{ marginTop: `${svcMarginTop}px`, width: `${svcWidth}px` }}><BreakableText text={service} wordRegexp={WORD_RX}/></h4>
            {operation && <div className="DdgNodeContent--label" style={{ width: `${opWidth}px` }}><BreakableText text={operation} wordRegexp={WORD_RX}/></div>}
          </div>
        </div>

        <div className="DdgNodeContent--actionsWrapper">
          {focalNodeUrl && (
            <a href={focalNodeUrl} className="DdgNodeContent--actionsItem">
              {setFocusIcon}
              <span className="DdgNodeContent--actionsItemText">Set focus</span>
            </a>
          )}
          <a className="DdgNodeContent--actionsItem" onClick={this.viewTraces} role="button">
            <NewWindowIcon />
            <span className="DdgNodeContent--actionsItemText">View traces</span>
          </a>
        </div>
      </div>
    );
  }
}
