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
  small?: boolean;
  style?: React.CSSProperties;
};

export default function IdVisibility(props: IdVisibilityProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { FullId, className, small, ...rest } = props;
  const [isVisible, setIsVisible] = React.useState(false);
  const cls = `
      IdVisibility
      ${className || ''}
    `;

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={cls} style={{ cursor: 'pointer' }} onClick={toggleVisibility}>
      {isVisible ? (
        <small className="u-tx-muted">{FullId}</small>
      ) : (
        <small className="u-tx-muted">Full ID</small>
      )}
    </div>
  );
}

IdVisibility.defaultProps = {
  className: undefined,
  small: false,
};
