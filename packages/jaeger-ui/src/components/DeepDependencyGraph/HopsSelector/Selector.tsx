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
import cx from 'classnames';

import { EStream, EFullness, THop } from './types';

import './Selector.css';

type TProps = {
  furthestDistance: number;
  furthestFullness: EFullness;
  handleClick: (distance: number, direction: EStream) => void;
  hops: THop[];
  stream: EStream;
};

export default class Selector extends PureComponent<TProps> {
  private btn = ({ distance, fullness, suffix = 'popover-content' }: THop & { suffix?: string }) => {
    const { handleClick, stream } = this.props;
    return (
      <button
        key={`${distance} ${stream} ${suffix}`}
        className={cx('Selector--btn', fullness, suffix)}
        type="button"
        onClick={() => handleClick(distance, stream)}
      >
        {Math.abs(distance)}
      </button>
    );
  };

  render() {
    const { furthestDistance, furthestFullness, handleClick, hops, stream } = this.props;
    const streamLabel = `${stream === EStream.down ? 'Down' : 'Up'}stream hops`;
    const lowercaseLabel = streamLabel.toLowerCase();
    if (hops.length === 1) {
      return <span className="Selector">No {lowercaseLabel}</span>;
    }

    const decrementBtn = (
      <button
        key={`decrement ${stream}`}
        disabled={furthestDistance === 0}
        type="button"
        onClick={() => handleClick(furthestDistance - stream, stream)}
      >
        -
      </button>
    );
    const incrementBtn = (
      <button
        key={`increment ${stream}`}
        disabled={furthestDistance === hops[hops.length - 1].distance}
        type="button"
        onClick={() => handleClick(furthestDistance + stream, stream)}
      >
        +
      </button>
    );
    const delimiterBtn = this.btn({
      ...hops[hops.length - 1],
      suffix: 'delimiter',
    });
    const furthestBtn = this.btn({
      distance: furthestDistance,
      fullness: furthestFullness,
      suffix: 'furthest',
    });

    return (
      <Popover
        arrowPointAtCenter
        content={[decrementBtn, hops.map(this.btn), incrementBtn]}
        placement="bottom"
        title={`Visible ${lowercaseLabel}`}
      >
        <span className="Selector">
          {streamLabel} {furthestBtn} / {delimiterBtn}
        </span>
      </Popover>
    );
  }
}
