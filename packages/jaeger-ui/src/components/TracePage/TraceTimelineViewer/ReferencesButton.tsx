// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Dropdown, Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip';
import NewWindowIcon from '../../common/NewWindowIcon';
import { ILink } from '../../../types/otel';

import './ReferencesButton.css';

type TReferencesButtonProps = {
  links: ReadonlyArray<ILink>;
  children: React.ReactNode;
  tooltipText: string;
  focusSpan: (spanID: string) => void;
};

// ReferencesButton is displayed as a menu at the span level.
// Example: https://github.com/jaegertracing/jaeger-ui/assets/94157520/2b29921a-2225-4a01-9018-1a1952f186ef
export default class ReferencesButton extends React.PureComponent<TReferencesButtonProps> {
  linksList = (links: ReadonlyArray<ILink>) => {
    const dropdownItems = links.map(link => {
      const { span } = link;
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
    const { links, children, tooltipText, focusSpan } = this.props;

    const tooltipProps = {
      arrowPointAtCenter: true,
      mouseLeaveDelay: 0.5,
      placement: 'bottom' as TooltipPlacement,
      title: tooltipText,
      classNames: { root: 'ReferencesButton--tooltip' },
    };

    if (links.length > 1) {
      return (
        <Tooltip {...tooltipProps}>
          <Dropdown menu={{ items: this.linksList(links) }} placement="bottomRight" trigger={['click']}>
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
}
