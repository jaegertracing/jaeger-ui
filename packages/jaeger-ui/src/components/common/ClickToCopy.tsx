// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'antd';

type Props = {
  text: string;
  className?: string;
  children: React.ReactNode;
};

function copy(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

function ClickToCopy({ text, className = '', children }: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const [previousClick, setPreviousClick] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isCopied) {
      const checkDeadline = () => {
        if (Date.now() >= previousClick + 1800) {
          setIsCopied(false);
        } else {
          timeoutRef.current = setTimeout(checkDeadline, 100);
        }
      };
      timeoutRef.current = setTimeout(checkDeadline, 100);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isCopied, previousClick]);

  const whenClicked = () => {
    copy(text);
    setIsCopied(true);
    setPreviousClick(Date.now());
  };

  return (
    <Tooltip title={isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}>
      <span
        className={className}
        onClick={whenClicked}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            whenClicked();
            e.preventDefault();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
      >
        {children}
      </span>
    </Tooltip>
  );
}

export default ClickToCopy;
