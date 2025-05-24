// Copyright (c) 2023 The Jaeger Authors
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
import { Tooltip } from 'antd';
import { IoGitNetwork } from 'react-icons/io5';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUrl } from '../url';
import { Span } from '../../../types/trace';
import './ReRootButton.css';

type TProps = {
  span: Span;
  traceId: string;
  isRootSpan: boolean;
};

export default function ReRootButton({ span, traceId, isRootSpan }: TProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { spanID } = span;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRootSpan) return;
    
    // Get current uiFind from URL if it exists
    const searchParams = new URLSearchParams(location.search);
    const uiFind = searchParams.get('uiFind') || undefined;
    
    // Navigate to the re-rooted trace view
    navigate(getUrl(traceId, uiFind, spanID));
  };

  return (
    <Tooltip
      title={isRootSpan ? "This is the root span" : "Re-root trace at this span"}
      placement="top"
    >
      <button
        className={`ReRootButton ${isRootSpan ? 'ReRootButton--disabled' : ''}`}
        onClick={handleClick}
        disabled={isRootSpan}
        data-testid="re-root-button"
      >
        <IoGitNetwork className="ReRootButton--icon" />
        {isRootSpan ? 'Root' : 'Re-root'}
      </button>
    </Tooltip>
  );
}