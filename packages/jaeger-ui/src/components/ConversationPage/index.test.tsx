// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';
import { useConversationTraces } from '../../hooks/useConversationTraces';
import { useServices } from '../../hooks/useTraceDiscovery';
import type { TraceSummary } from '../../types/trace-summary';
import type { Microseconds } from '../../types/units';
import ConversationPage from '.';

vi.mock('../../hooks/useConfig', () => ({ useConfig: vi.fn() }));
vi.mock('../../hooks/useTraceDiscovery', () => ({ useServices: vi.fn() }));
vi.mock('../../hooks/useConversationTraces', () => ({
  CONVERSATION_TURN_LIMIT: 3,
  useConversationTraces: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig);
const mockUseServices = vi.mocked(useServices);
const mockUseConversationTraces = vi.mocked(useConversationTraces);

const SECOND_US = 1_000_000;
const T0 = Date.UTC(2026, 0, 31, 12) * 1000;

function summary(traceID: string, offsetSeconds: number, extra: Partial<TraceSummary> = {}): TraceSummary {
  return {
    traceID,
    traceName: `agent: turn ${traceID}`,
    rootServiceName: 'agent',
    rootOperationName: 'invoke_agent',
    startTime: (T0 + offsetSeconds * SECOND_US) as Microseconds,
    duration: (2 * SECOND_US) as Microseconds,
    spanCount: 5,
    errorSpanCount: 0,
    services: [],
    ...extra,
  };
}

function mockQuery(value: Partial<ReturnType<typeof useConversationTraces>>) {
  mockUseConversationTraces.mockReturnValue({
    data: undefined,
    error: null,
    isFetching: false,
    ...value,
  } as ReturnType<typeof useConversationTraces>);
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(url = '/conversation/conv-1?service=agent') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/conversation/:id"
          element={
            <>
              <ConversationPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('<ConversationPage>', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ backendCapabilities: { searchWithoutServiceName: false } } as ReturnType<
      typeof useConfig
    >);
    mockUseServices.mockReturnValue({ data: ['agent', 'gateway'] } as ReturnType<typeof useServices>);
    mockQuery({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('queries the conversation from the URL', () => {
    renderPage('/conversation/conv%2F1?service=agent&lookback=2d');
    expect(mockUseConversationTraces).toHaveBeenCalledWith({
      conversationID: 'conv/1',
      service: 'agent',
      lookback: '2d',
    });
    expect(screen.getByRole('heading', { name: 'Conversation' })).toBeInTheDocument();
    expect(document.querySelector('.ConversationPage--id')).toHaveTextContent('conv/1');
  });

  it('lists the turns in order with links to their traces', () => {
    mockQuery({
      data: {
        attribute: 'gen_ai.conversation.id',
        turns: [summary('aaaaaaa1', 0), summary('bbbbbbb2', 90, { errorSpanCount: 2 })],
      },
    });
    const { container } = renderPage();

    expect(container.querySelector('.ConversationPage--summary')).toHaveTextContent(
      '2 turns over 1.5mMatched on gen_ai.conversation.id'
    );

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/trace/aaaaaaa1');
    expect(within(rows[0]).getByText('First turn')).toBeInTheDocument();
    expect(within(rows[0]).getByText('0')).toHaveClass('ConversationPage--muted');
    expect(within(rows[1]).getByRole('link')).toHaveAttribute('href', '/trace/bbbbbbb2');
    expect(within(rows[1]).getByText('+1m 30s after turn 1')).toBeInTheDocument();
    expect(rows[1].querySelector('.ConversationPage--errorTag')).toHaveTextContent('2');
    expect(rows[0].querySelector('.ConversationPage--errorTag')).toBeNull();
  });

  it('says which attribute matched when it fell back to session.id', () => {
    mockQuery({ data: { attribute: 'session.id', turns: [summary('a', 0)] } });
    const { container } = renderPage();
    expect(container.querySelector('.ConversationPage--summary')).toHaveTextContent(
      /^1 turn over .*Matched on session\.id$/
    );
  });

  it('warns when the search may have cut off turns', () => {
    mockQuery({
      data: { attribute: 'session.id', turns: [summary('a', 0), summary('b', 1), summary('c', 2)] },
    });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Some turns may be missing');
  });

  it('explains an empty result and the expected attribute shape', () => {
    mockQuery({ data: { turns: [] } });
    renderPage('/conversation/conv-1?service=agent&lookback=2d');
    expect(screen.getByText(/No traces in the last 2 days from agent have/)).toBeInTheDocument();
    expect(screen.getByText(/matched exactly, as a plain string/)).toBeInTheDocument();
  });

  it('asks for a service when the backend cannot search across all services', () => {
    renderPage('/conversation/conv-1');
    expect(mockUseConversationTraces).toHaveBeenCalledWith(null);
    expect(screen.getByText(/cannot search across all services/)).toBeInTheDocument();
  });

  it('searches all services when the backend supports it', () => {
    mockUseConfig.mockReturnValue({ backendCapabilities: { searchWithoutServiceName: true } } as ReturnType<
      typeof useConfig
    >);
    renderPage('/conversation/conv-1');
    expect(mockUseConversationTraces).toHaveBeenCalledWith({
      conversationID: 'conv-1',
      service: undefined,
      lookback: '7d',
    });
  });

  it('shows the error of a failed search', () => {
    mockQuery({ error: new Error('backend down') });
    renderPage();
    expect(screen.getByText(/backend down/)).toBeInTheDocument();
  });

  it('shows a loading indicator before the first result', () => {
    mockQuery({ isFetching: true });
    const { container } = renderPage();
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('writes a new lookback to the URL', async () => {
    const user = userEvent.setup();
    mockQuery({ data: { turns: [] } });
    renderPage();
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(await screen.findByTitle('Last 2 days'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/conversation/conv-1?lookback=2d&service=agent'
    );
  });

  it('writes a new service to the URL', async () => {
    const user = userEvent.setup();
    mockQuery({ data: { turns: [] } });
    renderPage();
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByTitle('gateway'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/conversation/conv-1?lookback=7d&service=gateway'
    );
  });
});
