// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip } from 'antd';
import { Link } from 'react-router-dom';

import { lookbackCovering, type ConversationRef } from '../../ConversationPage/conversation';
import { getUrl } from '../../ConversationPage/url';
import type { Microseconds } from '../../../types/units';

type ConversationLinkProps = {
  conversation: ConversationRef;
  traceStart: Microseconds;
};

/** Links a GenAI trace to the other turns of the conversation it records. */
export default function ConversationLink({ conversation, traceStart }: ConversationLinkProps) {
  const { id, attribute, service } = conversation;
  const to = getUrl(id, { service, lookback: lookbackCovering(traceStart) });
  return (
    <Tooltip title={`All traces with ${attribute} = ${id}`}>
      <Link className="TracePageHeader--conversationLink" to={to}>
        View conversation
      </Link>
    </Tooltip>
  );
}
