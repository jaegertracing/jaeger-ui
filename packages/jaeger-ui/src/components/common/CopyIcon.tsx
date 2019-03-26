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

import { Icon, Tooltip } from 'antd';
import CopyToClipboard from 'react-copy-to-clipboard';

type PropsType = {
  className?: string;
  copyText: string;
  tooltipTitle: string;
};

type StateType = {
  hasCopied: boolean;
};

export default class CopyIcon extends React.PureComponent<PropsType, StateType> {
  static defaultProps: Partial<PropsType> = {
    className: undefined,
  };

  state = {
    hasCopied: false,
  };

  handleClick = () => {
    this.setState({
      hasCopied: true,
    });
  };

  handleTooltipVisibilityChange = (visible: boolean) => {
    if (!visible && this.state.hasCopied) {
      this.setState({
        hasCopied: false,
      });
    }
  };

  render() {
    return (
      <Tooltip
        arrowPointAtCenter
        mouseLeaveDelay={0.5}
        onVisibleChange={this.handleTooltipVisibilityChange}
        placement="left"
        title={this.state.hasCopied ? 'Copied' : this.props.tooltipTitle}
      >
        <CopyToClipboard text={this.props.copyText}>
          <Icon className={this.props.className} onClick={this.handleClick} type="copy" />
        </CopyToClipboard>
      </Tooltip>
    );
  }
}
