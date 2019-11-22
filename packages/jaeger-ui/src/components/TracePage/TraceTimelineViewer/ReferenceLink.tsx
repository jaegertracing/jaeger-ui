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

import React from 'react';
import { SpanReference } from '../../../types/trace';
import { getUrl } from '../url';

type ReferenceLinkProps = {
  reference: SpanReference;
  traceID: string;
  children?: React.ReactNode;
  className?: string;
  focusSpan: (spanID: string) => void;
  onClick?: () => void;
};

export default class ReferenceLink extends React.PureComponent<ReferenceLinkProps> {
  linkToExternalSpan = (traceID: string, spanID: string) => `${getUrl(traceID)}/uiFind?=${spanID}`;

  render() {
    const { traceID, reference, children, className, focusSpan, ...otherProps } = this.props;
    delete otherProps.onClick;
    if (traceID === reference.traceID) {
      return (
        <a role="button" onClick={() => focusSpan(reference.spanID)} className={className} {...otherProps}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={this.linkToExternalSpan(reference.traceID, reference.spanID)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...otherProps}
      >
        {children}
      </a>
    );
  }
}
