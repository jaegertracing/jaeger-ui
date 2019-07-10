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
import Selector from './Selector';

import { EStream, EFullness, THop } from './types';

type TProps = {
  ddgModel: TDdgModel;
  updateVisEncoding: (visEncoding: string) => void;
  visEncoding?: string;
};

export default class HopsSelector extends PureComponent<TProps> {
  private handleClick = (clickedDistance: number, direction: EStream) => {
    const { ddgModel, updateVisEncoding, visEncoding } = this.props;
    const { distanceToPathElems, visIdxToPathElem } = ddgModel;

    let nextVisible: number[];
    if (visEncoding) {
      nextVisible = decode(visEncoding).filter(
        idx => visIdxToPathElem[idx] && Math.sign(visIdxToPathElem[idx].distance) !== direction
      );
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
  };

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
      let fullness: EFullness;
      if (visibleIndices) {
        const visible = elems.filter(({ visibilityIdx }) => visibleIndices.has(visibilityIdx));
        if (visible.length === elems.length) {
          fullness = EFullness.full;
        } else if (!visible.length) {
          fullness = EFullness.empty;
        } else {
          fullness = EFullness.partial;
        }
      } else {
        fullness = Math.abs(distance) <= 2 ? EFullness.full : EFullness.empty;
      }

      hops.push({ distance, fullness });
      if (fullness !== EFullness.empty) {
        if (distance > maxVisDistance) {
          maxVisDistance = distance;
          maxVisDistanceFullness = fullness;
        } else if (distance < minVisDistance) {
          minVisDistance = distance;
          minVisDistanceFullness = fullness;
        }
      }
    });

    hops.sort(({ distance: a }, { distance: b }) => a - b);
    const splitIdx = hops.findIndex(({ distance }) => !distance);
    const upstream = hops.slice(0, splitIdx + 1).reverse();
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
