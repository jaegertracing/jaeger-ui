// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Dropdown, Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip';
import NewWindowIcon from '../../common/NewWindowIcon';
import { SpanReference } from '../../../types/trace';
import { ILink, IOtelSpan } from '../../../types/otel';

import './ReferencesButton.css';
import ReferenceLink from '../url/ReferenceLink';

type TReferencesButtonProps = {
  // Legacy support
  references?: ReadonlyArray<SpanReference>;
  // OTEL support
  links?: ReadonlyArray<ILink>;
  spanMap?: ReadonlyMap<string, IOtelSpan>;
  children: React.ReactNode;
  tooltipText: string;
  focusSpan: (spanID: string) => void;
};

// ReferencesButton is displayed as a menu at the span level.
// Example: https://github.com/jaegertracing/jaeger-ui/assets/94157520/2b29921a-2225-4a01-9018-1a1952f186ef
export default class ReferencesButton extends React.PureComponent<TReferencesButtonProps> {
  referencesList = (references: ReadonlyArray<SpanReference>) => {
    const dropdownItems = references.map(ref => {
      const { span, spanID } = ref;
      return {
        key: `${spanID}`,
        label: (
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
        ),
      };
    });
    return dropdownItems;
  };

  linksList = (links: ReadonlyArray<ILink>, spanMap: ReadonlyMap<string, IOtelSpan>) => {
    const dropdownItems = links.map(link => {
      const span = spanMap.get(link.spanId);
      const isSameTrace = span !== undefined;
      return {
        key: `${link.spanId}`,
        label: (
          <a
            onClick={() => this.props.focusSpan(link.spanId)}
            className="ReferencesButton--TraceRefLink"
            role="button"
            tabIndex={0}
          >
            {isSameTrace
              ? `${span.resource.serviceName}:${span.name} - ${link.spanId}`
              : `(another trace) - ${link.spanId}`}
            {!isSameTrace && <NewWindowIcon />}
          </a>
        ),
      };
    });
    return dropdownItems;
  };

  render() {
    const { references, links, spanMap, children, tooltipText, focusSpan } = this.props;

    const tooltipProps = {
      arrowPointAtCenter: true,
      mouseLeaveDelay: 0.5,
      placement: 'bottom' as TooltipPlacement,
      title: tooltipText,
      classNames: { root: 'ReferencesButton--tooltip' },
    };

    // Handle legacy references
    if (references && references.length > 0) {
      if (references.length > 1) {
        return (
          <Tooltip {...tooltipProps}>
            <Dropdown
              menu={{ items: this.referencesList(references) }}
              placement="bottomRight"
              trigger={['click']}
            >
              <a className="ReferencesButton-MultiParent">{children}</a>
            </Dropdown>
          </Tooltip>
        );
      }
      const ref = references[0];
      return (
        <Tooltip {...tooltipProps}>
          <ReferenceLink reference={ref} focusSpan={focusSpan} className="ReferencesButton-MultiParent">
            {children}
          </ReferenceLink>
        </Tooltip>
      );
    }

    // Handle OTEL links
    if (links && links.length > 0 && spanMap) {
      if (links.length > 1) {
        return (
          <Tooltip {...tooltipProps}>
            <Dropdown
              menu={{ items: this.linksList(links, spanMap) }}
              placement="bottomRight"
              trigger={['click']}
            >
              <a className="ReferencesButton-MultiParent">{children}</a>
            </Dropdown>
          </Tooltip>
        );
      }
      const link = links[0];
      return (
        <Tooltip {...tooltipProps}>
          <a
            onClick={() => focusSpan(link.spanId)}
            className="ReferencesButton-MultiParent"
            role="button"
            tabIndex={0}
          >
            {children}
          </a>
        </Tooltip>
      );
    }

    return null;
  }
}
