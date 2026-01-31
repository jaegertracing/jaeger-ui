// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { memo } from 'react';

import { decode } from '../../../../model/ddg/visibility-codec';
import { ECheckedStatus, EDirection, TDdgDistanceToPathElems, THop } from '../../../../model/ddg/types';
import Selector from './Selector';

type TProps = {
  distanceToPathElems?: TDdgDistanceToPathElems;
  handleClick: (distance: number, direction: EDirection) => void;
  visEncoding?: string;
};

export default memo(function HopsSelector({ distanceToPathElems, handleClick, visEncoding }: TProps) {
  if (!distanceToPathElems) return <div />;

  const downstreamHops: THop[] = [];
  const upstreamHops: THop[] = [];
  let minFullDistance = 0;
  let minVisDistance = 0;
  let minVisDistanceFullness = ECheckedStatus.Empty;
  let maxFullDistance = 0;
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

    if (fullness === ECheckedStatus.Full) {
      if (distance >= maxFullDistance) maxFullDistance = distance;
      if (distance <= minFullDistance) minFullDistance = distance;
    }
  });

  downstreamHops.sort(({ distance: a }, { distance: b }) => a - b);
  upstreamHops.sort(({ distance: a }, { distance: b }) => b - a);

  return (
    <div>
      <Selector
        direction={EDirection.Upstream}
        handleClick={handleClick}
        hops={upstreamHops}
        furthestDistance={minVisDistance}
        furthestFullDistance={minFullDistance}
        furthestFullness={minVisDistanceFullness}
      />
      <Selector
        direction={EDirection.Downstream}
        handleClick={handleClick}
        hops={downstreamHops}
        furthestDistance={maxVisDistance}
        furthestFullDistance={maxFullDistance}
        furthestFullness={maxVisDistanceFullness}
      />
    </div>
  );
});
