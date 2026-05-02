// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'antd';

type Props = {
  text: string;
  className?: string;
  children: React.ReactNode;
};

function ClickToCopy({ text, className = '', children }: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const whenClicked = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), 1800);
    } catch {
      // clipboard write failed (e.g. permission denied in insecure context)
    }
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
