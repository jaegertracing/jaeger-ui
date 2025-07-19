// Copyright (c) 2025 The Jaeger Authors
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
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isCopied) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
      }
    };
  }, [isCopied, previousClick]);

  const whenClicked = () => {
    console.log('ClickToCopy clicked!', text); // Debug log
    copy(text);
    setIsCopied(true);
    setPreviousClick(Date.now());
  };

  return (
    <Tooltip title={isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}>
      <span
        className={className}
        onClick={whenClicked}
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
