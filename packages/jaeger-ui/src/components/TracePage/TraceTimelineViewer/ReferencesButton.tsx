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
import { Dropdown, Menu, Tooltip } from 'antd';
import NewWindowIcon from '../../common/NewWindowIcon';

import { getUrl } from '../url';
import { SpanReference } from '../../../types/trace';

import './ReferencesButton.css';

type TReferencesButtonProps = {
  references: SpanReference[];
  traceID: string;
  children?: React.ReactNode;
  tooltipText: string;
  focusSpan: (spanID: string) => void;
};

const linkToExternalSpan = (traceID: string, spanID: string) => `${getUrl(traceID)}/uiFind?=${spanID}`;

// export for tests
export default class ReferencesButton extends React.PureComponent<TReferencesButtonProps> {
  _focusSpan(spanID: string) {
    this.props.focusSpan(spanID);
  }

  spanLink = (reference: SpanReference, traceID: string, children?: React.ReactNode, className?: string) => {
    if (traceID === reference.traceID) {
      return (
        <a role="button" onClick={() => this._focusSpan(reference.spanID)} className={className}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={linkToExternalSpan(reference.traceID, reference.spanID)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  };

  referencesList = (references: SpanReference[]) => (
    <Menu>
      {references.map(ref => {
        const { span, traceID, spanID } = ref;
        const child = (
          <React.Fragment>
            {span
              ? `${span.process.serviceName}:${span.operationName} - ${ref.spanID}`
              : `(another trace) - ${ref.spanID}`}
            {traceID !== this.props.traceID && (
              <div className="external-trace-ref">
                <NewWindowIcon />
              </div>
            )}
          </React.Fragment>
        );
        return <Menu.Item key={`${spanID}`}>{this.spanLink(ref, this.props.traceID, child)}</Menu.Item>;
      })}
    </Menu>
  );

  render() {
    const { references, children, tooltipText } = this.props;
    if (references.length > 1) {
      return (
        <Tooltip
          arrowPointAtCenter
          mouseLeaveDelay={0.5}
          placement="bottom"
          title={tooltipText}
          overlayClassName="ref-tooltip"
        >
          <Dropdown overlay={this.referencesList(references)} placement="bottomRight" trigger={['click']}>
            <a className="multi-parent-button">{children}</a>
          </Dropdown>
        </Tooltip>
      );
    }
    const ref = references[0];
    return (
      <Tooltip
        arrowPointAtCenter
        mouseLeaveDelay={0.5}
        placement="bottom"
        title={tooltipText}
        overlayClassName="ref-tooltip"
      >
        {this.spanLink(ref, this.props.traceID, children, 'multi-parent-button')}
      </Tooltip>
    );
  }
}
