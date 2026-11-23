// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { IoChevronDown, IoChevronForward, IoHelp } from 'react-icons/io5';

import { KEEP_NEEDS_LIFT } from '../../spanFilter';

// The tooltips open on keyboard focus as well as on hover, so a keyboard user gets the same hints.
export const TOOLTIP_TRIGGERS: Array<'hover' | 'focus'> = ['hover', 'focus'];

/**
 * A control that creates a keep clause, with the tooltip that says why it is disabled: the tree mode
 * unless another reason is given. The control stays focusable while it is disabled, so that a
 * keyboard user reaches the reason.
 */
export function KeepControl({
  allowed,
  reason = KEEP_NEEDS_LIFT,
  children,
}: {
  allowed: boolean;
  reason?: string;
  children: React.ReactElement;
}) {
  return allowed ? (
    children
  ) : (
    <Tooltip title={reason} trigger={TOOLTIP_TRIGGERS}>
      {children}
    </Tooltip>
  );
}

type SectionProps = {
  title: string;
  // Controls shown in the header next to the title, such as Clear.
  actions?: React.ReactNode;
  // The text of the help tooltip behind the question mark next to the title.
  help?: React.ReactNode;
  // A section that cannot be collapsed renders its title as plain text.
  collapsible?: boolean;
  children: React.ReactNode;
};

/** One section of the filter popover: a header with the title and its actions, and a body that a collapsible section can fold. */
export default function Section({ title, actions, help, collapsible = true, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <section className="SpanFilter--section" aria-label={title}>
      <div className="SpanFilter--sectionHeader">
        <span className="SpanFilter--sectionLead">
          {collapsible ? (
            <button
              type="button"
              className="SpanFilter--sectionToggle"
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
            >
              {open ? <IoChevronDown aria-hidden /> : <IoChevronForward aria-hidden />}
              <span className="SpanFilter--sectionTitle">{title}</span>
            </button>
          ) : (
            <span className="SpanFilter--sectionTitle">{title}</span>
          )}
          {help && (
            <Tooltip title={help} trigger={TOOLTIP_TRIGGERS} overlayStyle={{ maxWidth: '420px' }}>
              <button type="button" className="SpanFilter--help" aria-label={`${title} help`}>
                <IoHelp aria-hidden />
              </button>
            </Tooltip>
          )}
        </span>
        {open && actions && <span className="SpanFilter--sectionActions">{actions}</span>}
      </div>
      {open && children}
    </section>
  );
}
