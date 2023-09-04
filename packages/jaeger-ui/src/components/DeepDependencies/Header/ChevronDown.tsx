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

import * as React from 'react';
import { IoChevronDown } from 'react-icons/io5';

import './ChevronDown.css';

type TProps = {
  className?: string;
  style?: React.CSSProperties;
};

function ChevronDown(props: TProps) {
  const { className, style } = props;
  const cls = `Ddg--Header--ChevronDown ${className || ''}`;
  return <IoChevronDown className={cls} style={style} />;
}

export default React.memo(ChevronDown);
