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

import React from 'react';
import { Popover } from 'antd';
import cx from 'classnames';

import { decode, encode } from '../../../model/ddg/visibility-codec';
import { TDdgModel } from '../../../model/ddg/types';

import { EStream, EFullness, THop } from './types';

import './Selector.css';

type TProps = {
  furthestDistance: number;
  furthestFullness: EFullness;
  handleClick: (distance: number, direction: EStream) => void;
  hops: THop[];
  stream: EStream;
};

export default function selector(props: TProps) {
  const { furthestDistance, furthestFullness, handleClick, hops, stream } = props; 
  const streamText = stream === EStream.down ? 'Down' : 'Up';
  const streamLabel = `${streamText}stream hops`;
  const btn = ({ distance, fullness, suffix = 'popover-content' }: THop & { suffix?: string }) => (
    <button
      key={`${distance} ${stream} ${suffix}`}
      className={cx('Selector--btn', fullness, streamText.toLowerCase(), suffix)}
      onClick={() => handleClick(distance, stream)}
    >
      {Math.abs(distance)}
    </button>
  );

  const furthestBtn = btn({ distance: furthestDistance, fullness: furthestFullness, suffix: 'furthest' })
  const delimiterBtn = btn({
    ...hops[hops.length - 1],
    suffix: 'delimiter',
  });

  return (
    <Popover placement={'bottom'} title={`Visible ${streamLabel.toLowerCase()}`}
content={hops.map(btn)}>
      <span className={'Selector'}>{streamLabel} {furthestBtn} / {delimiterBtn}</span>
    </Popover>
  );
}
