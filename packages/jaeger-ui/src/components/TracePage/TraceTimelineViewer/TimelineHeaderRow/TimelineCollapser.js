// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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

import { Popover, Icon } from 'antd';

import './TimelineCollapser.css';

type CollapserProps = {
  onCollapseAll: () => void,
  onCollapseOne: () => void,
  onExpandOne: () => void,
  onExpandAll: () => void,
};

export default function TimelineCollapser(props: CollapserProps) {
  const { onExpandAll, onExpandOne, onCollapseAll, onCollapseOne } = props;
  const content = (
    <div>
      <Icon type="right" onClick={onExpandOne} className="TimelineCollapserBtn ExpandBtn" />
      <a onClick={onExpandOne} role="button">
        Expand +1
      </a>
      <br />
      <Icon type="right" onClick={onCollapseOne} className="TimelineCollapserBtn" />
      <a onClick={onCollapseOne} role="button">
        Collapse +1
      </a>
      <br />
      <Icon type="double-right" onClick={onExpandAll} className="TimelineCollapserBtn ExpandBtn" />
      <a onClick={onExpandAll} role="button">
        Expand All
      </a>
      <br />
      <Icon type="double-right" onClick={onCollapseAll} className="TimelineCollapserBtn" />
      <a onClick={onCollapseAll} role="button">
        Collapse All
      </a>
    </div>
  );
  return (
    <span className="TimelineCollapser">
      <Popover placement="rightBottom" content={content} title="Expand/Collapse" trigger="hover">
        <Icon type="double-right" className="TimelineCollapserBtn ExpandBtn" />
      </Popover>
    </span>
  );
}
