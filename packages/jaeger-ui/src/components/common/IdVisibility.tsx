// Copyright (c) 2017 The Jaeger Authors.
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

type IdVisibilityProps = {
  FullId: string;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  isCollapsible?: boolean;
};

export default function IdVisibility(props: IdVisibilityProps) {
  const { FullId, className, style, inputStyle, isCollapsible } = props;
  const [isVisible, setIsVisible] = React.useState(false);

  const handleToggle = () => {
    if (isCollapsible) {
      setIsVisible(!isVisible);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={`IdVisibility ${className || ''}`}
      style={{ cursor: isCollapsible ? 'pointer' : 'default', ...style }}
      onClick={isCollapsible ? handleToggle : undefined}
    >
      {isVisible ? (
        <input
          type="text"
          value={FullId}
          readOnly
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'default',
            ...inputStyle,
          }}
        />
      ) : (
        <span className="u-tx-muted">{FullId.slice(0, 7)}</span> // Show short trace ID by default
      )}
    </div>
  );
}

IdVisibility.defaultProps = {
  className: undefined,
  style: {},
  inputStyle: {},
  isCollapsible: true,
};