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

import { decode, encodeDistance } from '../../../../model/ddg/visibility-codec';
import { ECheckedStatus, EDirection, TDdgModel, THop } from '../../../../model/ddg/types';
import Selector from './Selector';

type TProps = {
  ddgModel: TDdgModel;
  updateVisEncoding: (visEncoding: string) => void;
  visEncoding?: string;
};

export default class HopsSelector extends PureComponent<TProps> {
  private handleClick = (distance: number, direction: EDirection) => {
    const { ddgModel, updateVisEncoding, visEncoding } = this.props;

    updateVisEncoding(
      encodeDistance({
        ddgModel,
        direction,
        distance,
        prevVisEncoding: visEncoding,
      })
    );
  };

  render() {
    const { ddgModel, visEncoding } = this.props;
    const { distanceToPathElems } = ddgModel;

    const downstreamHops: THop[] = [];
    const upstreamHops: THop[] = [];
    let minVisDistance = 0;
    let minVisDistanceFullness = ECheckedStatus.Empty;
    let maxVisDistance = 0;
    let maxVisDistanceFullness = ECheckedStatus.Empty;
    const visibleIndices = visEncoding && new Set(decode(visEncoding));

    distanceToPathElems.forEach((elems, distance) => {
      let fullness: ECheckedStatus;
      if (visibleIndices) {
        const visible = elems.filter(({ visibilityIdx }) => visibleIndices.has(visibilityIdx));
        if (visible.length === elems.length) {
          fullness = ECheckedStatus.Full;
        } else if (!visible.length) {
          fullness = ECheckedStatus.Empty;
        } else {
          fullness = ECheckedStatus.Partial;
        }
      } else {
        fullness = Math.abs(distance) <= 2 ? ECheckedStatus.Full : ECheckedStatus.Empty;
      }

      if (distance >= 0) downstreamHops.push({ distance, fullness });
      if (distance <= 0) upstreamHops.push({ distance, fullness });

      if (fullness !== ECheckedStatus.Empty) {
        if (distance >= maxVisDistance) {
          maxVisDistance = distance;
          maxVisDistanceFullness = fullness;
        }
        if (distance <= minVisDistance) {
          minVisDistance = distance;
          minVisDistanceFullness = fullness;
        }
      }
    });

    downstreamHops.sort(({ distance: a }, { distance: b }) => a - b);
    upstreamHops.sort(({ distance: a }, { distance: b }) => b - a);

    return (
      <div>
        <Selector
          direction={EDirection.Upstream}
          handleClick={this.handleClick}
          hops={upstreamHops}
          furthestDistance={minVisDistance}
          furthestFullness={minVisDistanceFullness}
        />
        <Selector
          direction={EDirection.Downstream}
          handleClick={this.handleClick}
          hops={downstreamHops}
          furthestDistance={maxVisDistance}
          furthestFullness={maxVisDistanceFullness}
        />
      </div>
    );
  }
}
