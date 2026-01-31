// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
