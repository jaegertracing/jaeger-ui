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

import { Tooltip, Icon } from 'antd';

import './TimelineCollapser.css';

type CollapserProps = {
  onCollapseAll: () => void,
  onCollapseOne: () => void,
  onExpandOne: () => void,
  onExpandAll: () => void,
};

export default function TimelineCollapser(props: CollapserProps) {
  const { onExpandAll, onExpandOne, onCollapseAll, onCollapseOne } = props;
  return (
    <span className="TimelineCollapser">
      <Tooltip title="Expand +1">
        <Icon type="right" onClick={onExpandOne} className="TimelineCollapserBtn" />
      </Tooltip>
      <Tooltip title="Collapse +1">
        <Icon type="left" onClick={onCollapseOne} className="TimelineCollapserBtn" />
      </Tooltip>
      <Tooltip title="Expand All">
        <Icon type="double-right" onClick={onExpandAll} className="TimelineCollapserBtn" />
      </Tooltip>
      <Tooltip title="Collapse All">
        <Icon type="double-left" onClick={onCollapseAll} className="TimelineCollapserBtn" />
      </Tooltip>
    </span>
  );
}
