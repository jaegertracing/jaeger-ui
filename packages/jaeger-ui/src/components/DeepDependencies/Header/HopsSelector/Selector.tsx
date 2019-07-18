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
import { Popover } from 'antd';
import SortAmountAsc from 'react-icons/lib/fa/sort-amount-asc.js';
import IoChevronDown from 'react-icons/lib/io/chevron-down';
import IoChevronRight from 'react-icons/lib/io/chevron-right';

import { ECheckedStatus, EDirection, THop } from '../../../../model/ddg/types';

import './Selector.css';

type TProps = {
  direction: EDirection;
  furthestDistance: number;
  furthestFullness: ECheckedStatus;
  handleClick: (distance: number, direction: EDirection) => void;
  hops: THop[];
};

const CLASSNAME = 'HopsSelector--Selector';

export default class Selector extends PureComponent<TProps> {
  private makeBtn = (
    { distance, fullness, suffix = 'popover-content' }: THop & { suffix?: string },
    showChevron?: number
  ) => {
    const { handleClick, direction } = this.props;
    return (
      <>
        {Boolean(showChevron) && <IoChevronRight className={`${CLASSNAME}--ChevronRight is-${fullness}`} />}
        <button
          key={`${distance} ${direction} ${suffix}`}
          className={`${CLASSNAME}--btn is-${fullness} ${CLASSNAME}--${suffix}`}
          type="button"
          onClick={() => handleClick(distance, direction)}
        >
          {Math.abs(distance)}
        </button>
      </>
    );
  };

  render() {
    const { direction, furthestDistance, furthestFullness, handleClick, hops } = this.props;
    const streamText = direction === EDirection.Downstream ? 'Down' : 'Up';
    const streamLabel = `${streamText}stream hops`;
    const lowercaseLabel = streamLabel.toLowerCase();
    if (hops.length === 1) {
      return <span className={CLASSNAME}>No {lowercaseLabel}</span>;
    }

    const decrementBtn = (
      <button
        key={`decrement ${direction}`}
        disabled={furthestDistance === 0}
        className={`${CLASSNAME}--decrement`}
        type="button"
        onClick={() => handleClick(furthestDistance - direction, direction)}
      >
        -
      </button>
    );
    const incrementBtn = (
      <button
        key={`increment ${direction}`}
        disabled={furthestDistance === hops[hops.length - 1].distance}
        className={`${CLASSNAME}--increment`}
        type="button"
        onClick={() => handleClick(furthestDistance + direction, direction)}
      >
        +
      </button>
    );
    const delimiterBtn = this.makeBtn({
      ...hops[hops.length - 1],
      suffix: 'delimiter',
    });
    const furthestBtn = this.makeBtn({
      distance: furthestDistance,
      fullness: furthestFullness,
      suffix: 'furthest',
    });

    return (
      <Popover
        arrowPointAtCenter
        content={[decrementBtn, ...hops.map(this.makeBtn), incrementBtn]}
        placement="bottom"
        title={`Visible ${lowercaseLabel}`}
      >
        <span className={CLASSNAME}>
          <SortAmountAsc className={`${CLASSNAME}--AscIcon is-${streamText}`} />
          {streamLabel}
          {furthestBtn}
          <span className={`${CLASSNAME}--slash`}>/</span>
          {delimiterBtn}
          <IoChevronDown className={`${CLASSNAME}--ChevronDown`} />
        </span>
      </Popover>
    );
  }
}
