// Copyright (c) 2019 The Jaeger Authors.
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
import NewWindowIcon from '../../common/NewWindowIcon';
import { SpanReference } from '../../../types/trace';
import { UITooltip, UIDropdown, UIMenuItem, UIMenu, TooltipPlacement } from '../uiElementsContext';

import './ReferencesButton.css';
import ReferenceLink from '../url/ReferenceLink';

type TReferencesButtonProps = {
  references: SpanReference[];
  children: React.ReactNode;
  tooltipText: string;
  focusSpan: (spanID: string) => void;
};

export default class ReferencesButton extends React.PureComponent<TReferencesButtonProps> {
  referencesList = (references: SpanReference[]) => (
    <UIMenu>
      {references.map(ref => {
        const { span, spanID } = ref;
        return (
          <UIMenuItem key={`${spanID}`}>
            <ReferenceLink
              reference={ref}
              focusSpan={this.props.focusSpan}
              className="ReferencesButton--TraceRefLink"
            >
              {span
                ? `${span.process.serviceName}:${span.operationName} - ${ref.spanID}`
                : `(another trace) - ${ref.spanID}`}
              {!span && <NewWindowIcon />}
            </ReferenceLink>
          </UIMenuItem>
        );
      })}
    </UIMenu>
  );

  render() {
    const { references, children, tooltipText, focusSpan } = this.props;

    const tooltipProps = {
      arrowPointAtCenter: true,
      mouseLeaveDelay: 0.5,
      placement: 'bottom' as TooltipPlacement,
      title: tooltipText,
      overlayClassName: 'ReferencesButton--tooltip',
    };

    if (references.length > 1) {
      return (
        <UITooltip {...tooltipProps}>
          <UIDropdown overlay={this.referencesList(references)} placement="bottomRight" trigger={['click']}>
            <a className="ReferencesButton-MultiParent">{children}</a>
          </UIDropdown>
        </UITooltip>
      );
    }
    const ref = references[0];
    return (
      <UITooltip {...tooltipProps}>
        <ReferenceLink reference={ref} focusSpan={focusSpan} className="ReferencesButton-MultiParent">
          {children}
        </ReferenceLink>
      </UITooltip>
    );
  }
}
