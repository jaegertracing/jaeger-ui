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

import React, { PureComponent } from 'react';

import { decode, encode } from '../../../model/ddg/visibility-codec';
import { TDdgModel } from '../../../model/ddg/types';
import Selector from './selector';

import { EStream, EFullness, THop } from './types';

type TProps = {
  ddgModel: TDdgModel;
  updateVisEncoding: (visEncoding: string) => void;
  visEncoding?: string;
};

export default class HopsSelector extends PureComponent<TProps> {
  constructor(props: TProps) {
    super(props);
    console.log(props.ddgModel.visIdxToPathElem);
    console.log(props.ddgModel.visIdxToPathElem.map(({ visibilityIdx, distance }) => ({ visibilityIdx, distance })));
  }

  private handleClick = (clickedDistance: number, direction: EStream) => {
    const { ddgModel, updateVisEncoding, visEncoding } = this.props;
    const { distanceToPathElems, visIdxToPathElem } = ddgModel;

    let nextVisible: number[];
    if (visEncoding) {
      nextVisible = decode(visEncoding)
        .filter(idx => visIdxToPathElem[idx] && Math.sign(visIdxToPathElem[idx].distance) !== direction)
    } else {
      nextVisible = [
        ...(distanceToPathElems.get(-1 * direction) || []),
        ...(distanceToPathElems.get(-2 * direction) || []),
      ].map(({ visibilityIdx }) => visibilityIdx);
    }

    for (let distance = 0; distance !== clickedDistance + direction; distance += direction) {
      const elems = distanceToPathElems.get(distance);
      if (elems) {
        nextVisible.push(...elems.map(({ visibilityIdx }) => visibilityIdx));
      }
    }

    updateVisEncoding(encode(nextVisible));
  }

  render() {
    const { ddgModel, visEncoding } = this.props;
    const { distanceToPathElems } = ddgModel;

    const hops: THop[] = [];
    let minVisDistance = 0;
    let minVisDistanceFullness = EFullness.empty;
    let maxVisDistance = 0;
    let maxVisDistanceFullness = EFullness.empty;
    const visibleIndices = visEncoding && new Set(decode(visEncoding));

    distanceToPathElems.forEach((elems, distance) => {
      let newValue: THop;
      if (visibleIndices) {
        const visible = elems.filter(({ visibilityIdx }) => visibleIndices.has(visibilityIdx));
        if (visible.length === elems.length) {
          newValue = { distance, fullness: EFullness.full }
        } else if (!visible.length) {
          newValue = { distance, fullness: EFullness.empty };
        } else {
          newValue = { distance, fullness: EFullness.partial };
        }
      } else {
        newValue = { distance, fullness: Math.abs(distance) <= 2 ? EFullness.full : EFullness.empty };
      }

      hops.push(newValue);
      if (newValue.fullness !== EFullness.empty) {
        if (newValue.distance > maxVisDistance) {
          maxVisDistance = newValue.distance;
          maxVisDistanceFullness = newValue.fullness;
        } else if (newValue.distance < minVisDistance) {
          minVisDistance = newValue.distance;
          minVisDistanceFullness = newValue.fullness;
        }
      }
    });

    hops.sort(({ distance: a }, { distance: b }) => a - b);
    const splitIdx = hops.findIndex(({ distance }) => !distance);
    const upstream = hops.slice(0, splitIdx + 1); // .reverse()
    const downstream = hops.slice(splitIdx);

    return (
      <div>
        <Selector
          handleClick={this.handleClick}
          hops={upstream}
          furthestDistance={minVisDistance}
          furthestFullness={minVisDistanceFullness}
          stream={EStream.up}
        />
        <Selector
          handleClick={this.handleClick}
          hops={downstream}
          furthestDistance={maxVisDistance}
          furthestFullness={maxVisDistanceFullness}
          stream={EStream.down}
        />
      </div>
    );
  }
}
