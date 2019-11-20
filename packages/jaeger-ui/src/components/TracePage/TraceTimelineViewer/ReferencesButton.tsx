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
import { SpanReference } from '../../../types/trace';

import './ReferencesButton.css';
import ReferenceLink from './ReferenceLink';

type TReferencesButtonProps = {
  references: SpanReference[];
  traceID: string;
  children?: React.ReactNode;
  tooltipText: string;
  focusSpan: (spanID: string) => void;
};

// export for tests
export default class ReferencesButton extends React.PureComponent<TReferencesButtonProps> {
  _focusSpan(spanID: string) {
    this.props.focusSpan(spanID);
  }

  referencesList = (references: SpanReference[]) => (
    <Menu>
      {references.map(ref => {
        const { span, traceID, spanID } = ref;
        return (
          <Menu.Item key={`${spanID}`}>
            <ReferenceLink reference={ref} traceID={this.props.traceID} focusSpan={this._focusSpan}>
              {span
                ? `${span.process.serviceName}:${span.operationName} - ${ref.spanID}`
                : `(another trace) - ${ref.spanID}`}
              {traceID !== this.props.traceID && (
                <div className="external-trace-ref">
                  <NewWindowIcon />
                </div>
              )}
            </ReferenceLink>
          </Menu.Item>
        );
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
        <ReferenceLink
          reference={ref}
          traceID={this.props.traceID}
          focusSpan={this._focusSpan}
          className="multi-parent-button"
        >
          {children}
        </ReferenceLink>
      </Tooltip>
    );
  }
}
