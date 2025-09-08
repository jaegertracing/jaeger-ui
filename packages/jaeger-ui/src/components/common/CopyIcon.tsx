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
import { useState } from 'react';

import { Button, Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip/index';
import cx from 'classnames';
import copy from 'copy-to-clipboard';

import './CopyIcon.css';
import { IoCopyOutline } from 'react-icons/io5';

type PropsType = {
  className?: string;
  copyText: string;
  icon?: React.ReactNode;
  placement?: TooltipPlacement;
  tooltipTitle: string;
  buttonText: string;
};

const CopyIcon: React.FC<PropsType> = ({
  className,
  copyText,
  icon = <IoCopyOutline />,
  placement = 'top',
  tooltipTitle,
  buttonText,
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleClick = () => {
    setHasCopied(true);
    copy(copyText);
  };

  const handleTooltipVisibilityChange = (visible: boolean) => {
    if (!visible && hasCopied) {
      setHasCopied(false);
    }
  };

  return (
    <Tooltip
      arrow={{ pointAtCenter: true }}
      mouseLeaveDelay={0}
      onOpenChange={handleTooltipVisibilityChange}
      placement={placement}
      title={hasCopied ? 'Copied' : tooltipTitle}
    >
      <Button className={cx(className, 'CopyIcon')} htmlType="button" icon={icon} onClick={handleClick}>
        {buttonText}
      </Button>
    </Tooltip>
  );
};

export default CopyIcon;
