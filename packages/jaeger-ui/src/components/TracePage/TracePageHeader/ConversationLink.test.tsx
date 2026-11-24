// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { Microseconds } from '../../../types/units';
import ConversationLink from './ConversationLink';

describe('<ConversationLink>', () => {
  it('links to the conversation, scoped to the service that records it', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ConversationLink
          conversation={{ id: 'conv-1', attribute: 'session.id', service: 'agent' }}
          traceStart={(Date.now() * 1000) as Microseconds}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'View conversation' });
    expect(link).toHaveAttribute('href', '/conversation/conv-1?lookback=7d&service=agent');

    await user.hover(link);
    expect(await screen.findByText('All traces with session.id = conv-1')).toBeInTheDocument();
  });
});
