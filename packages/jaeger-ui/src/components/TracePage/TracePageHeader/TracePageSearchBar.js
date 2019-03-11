// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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
import { Button, Input } from 'antd';
import cx from 'classnames';

import * as markers from './TracePageSearchBar.markers';
import { trackFilter } from '../index.track';
import UiFindInput from '../../common/UiFindInput';

import './TracePageSearchBar.css';

type TracePageSearchBarProps = {
  textFilter: string,
  prevResult: () => void,
  nextResult: () => void,
  clearSearch: () => void,
  resultCount: number,
  forwardedRef: { current: Input | null },
  navigable: boolean,
};

export function TracePageSearchBarFn(props: TracePageSearchBarProps) {
  const { clearSearch, forwardedRef, navigable, nextResult, prevResult, resultCount, textFilter } = props;

  const count = textFilter ? <span className="TracePageSearchBar--count">{resultCount}</span> : null;

  const navigationBtnDisabled = !navigable || !textFilter;
  const navigationBtnClass = cx('TracePageSearchBar--btn', { 'is-disabled': navigationBtnDisabled });
  const btnClass = cx('TracePageSearchBar--btn', { 'is-disabled': !textFilter });
  const uiFindInputInputProps = {
    'data-test': markers.IN_TRACE_SEARCH,
    className: 'TracePageSearchBar--bar ub-flex-auto',
    name: 'search',
    suffix: count,
  };

  return (
    <div className="ub-flex-auto ub-mx2 TracePageSearchBar">
      {/* style inline because compact overwrites the display */}
      <Input.Group compact style={{ display: 'flex' }}>
        <UiFindInput
          inputProps={uiFindInputInputProps}
          forwardedRef={forwardedRef}
          trackFindFunction={trackFilter}
        />
        <Button
          className={navigationBtnClass}
          disabled={navigationBtnDisabled}
          icon="up"
          onClick={prevResult}
        />
        <Button
          className={navigationBtnClass}
          disabled={navigationBtnDisabled}
          icon="down"
          onClick={nextResult}
        />
        <Button className={btnClass} disabled={!textFilter} icon="close" onClick={clearSearch} />
      </Input.Group>
    </div>
  );
}

// ghetto fabulous cast because the 16.3 API is not in flow yet
// https://github.com/facebook/flow/issues/6103
export default (React: any).forwardRef((props, ref) => (
  <TracePageSearchBarFn {...props} forwardedRef={ref} />
));
