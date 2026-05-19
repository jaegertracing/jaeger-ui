// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback } from 'react';
import { Input, InputRef, Tooltip } from 'antd';
import { useTraceTimelineStore } from './store';
import './TagHighlightInput.css';

type TagHighlightInputProps = {
  inputRef?: React.Ref<InputRef>;
};

export default React.forwardRef<InputRef, TagHighlightInputProps>(function TagHighlightInput(_props, ref) {
  const tagHighlight = useTraceTimelineStore(s => s.tagHighlight);
  const setTagHighlight = useTraceTimelineStore(s => s.setTagHighlight);
  const [inputValue, setInputValue] = useState(tagHighlight || '');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setTagHighlight(value || null);
    },
    [setTagHighlight]
  );

  return (
    <Tooltip title="Highlight spans by tag (e.g., component=jdbc)" styles={{ root: { maxWidth: 300 } }}>
      <Input
        ref={ref}
        placeholder="Highlight by tag..."
        value={inputValue}
        onChange={handleChange}
        allowClear
        className="TagHighlightInput"
        data-testid="tag-highlight-input"
      />
    </Tooltip>
  );
});
