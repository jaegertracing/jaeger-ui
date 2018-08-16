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

import * as markers from './TracePageSearchBar.markers';

import './TracePageSearchBar.css';

type TracePageSearchBarProps = {
  updateTextFilter: string => void,
  textFilter: string,
  prevResult: () => void,
  nextResult: () => void,
  clearSearch: () => void,
  resultCount: number,
};

function TracePageSearchBar(props: TracePageSearchBarProps, ref: any) {
  const { prevResult, nextResult, clearSearch, resultCount, updateTextFilter, textFilter } = props;

  const count = textFilter ? (
    <span className="TracePageSearchBar--count">{resultCount.toString()}</span>
  ) : null;

  const updateFilter = event => updateTextFilter(event.target.value);
  const onKeyDown = e => {
    if (e.keyCode === 27) clearSearch();
  };

  const btnClass = `TracePageSearchBar--btn${textFilter ? '' : ' is-disabled'}`;

  return (
    <div className="ub-flex-auto ub-mr2 TracePageSearchBar">
      {/* style inline because compact overwrites the display */}
      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          name="search"
          className="TracePageSearchBar--bar ub-flex-auto"
          placeholder="Search..."
          onChange={updateFilter}
          value={textFilter}
          data-test={markers.IN_TRACE_SEARCH}
          suffix={count}
          ref={ref}
          onKeyDown={onKeyDown}
          onPressEnter={nextResult}
        />
        <Button className={btnClass} disabled={!textFilter} icon="up" onClick={prevResult} />
        <Button className={btnClass} disabled={!textFilter} icon="down" onClick={nextResult} />
        <Button className={btnClass} disabled={!textFilter} icon="close" onClick={clearSearch} />
      </Input.Group>
    </div>
  );
}

// ghetto fabulous cast because the 16.3 API is not in flow yet
// https://github.com/facebook/flow/issues/6103
export default (React: any).forwardRef(TracePageSearchBar);
