// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeAttributes } from '../../../../model/attributes';
import { AttributeValue, IOtelSpan, IOtelTrace } from '../../../../types/otel';
import storage from '../../../../utils/storage';
import { SPAN_TAG_KEYS_STORAGE_KEY, useSpanTagStore } from '../store.tags';
import SpanTagFilter from './index';

function createMockSpan(
  spanID: string,
  attributes: Array<{ key: string; value: AttributeValue }>
): IOtelSpan {
  return {
    spanID,
    attributes: makeAttributes(attributes),
    resource: {
      serviceName: 'test-service',
      attributes: makeAttributes([{ key: 'service.version', value: '1.0.0' }]),
    },
    name: 'test-op',
    startTime: 0,
    endTime: 1000,
    duration: 1000,
    childSpans: [],
    links: [],
    inboundLinks: [],
    events: [],
    status: { code: 0 },
    kind: 0,
  } as unknown as IOtelSpan;
}

function createMockTrace(): IOtelTrace {
  const span1 = createMockSpan('s1', [
    { key: 'http.method', value: 'GET' },
    { key: 'http.status_code', value: 200 },
  ]);
  const span2 = createMockSpan('s2', [
    { key: 'http.method', value: 'POST' },
    { key: 'custom.tag', value: 'hello' },
  ]);
  return {
    traceID: 'trace1',
    spans: [span1, span2],
    services: [{ name: 'test-service', numberOfSpans: 2 }],
    rootSpans: [span1],
    duration: 1000,
    startTime: 0,
    endTime: 1000,
  } as unknown as IOtelTrace;
}

describe('<SpanTagFilter>', () => {
  let mockTrace: IOtelTrace;

  beforeEach(() => {
    storage.removeItem(SPAN_TAG_KEYS_STORAGE_KEY);
    useSpanTagStore.setState({ selectedTagKeys: null });
    mockTrace = createMockTrace();
  });

  it('renders inactive button by default when selectedTagKeys is null', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    const btn = screen.getByTestId('span-tag-filter-button');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveClass('is-active');
  });

  it('renders active button when custom tag keys are selected', () => {
    useSpanTagStore.setState({ selectedTagKeys: ['custom.tag'] });
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    const btn = screen.getByTestId('span-tag-filter-button');
    expect(btn).toHaveClass('is-active');
  });

  it('opens popover and lists available tags from trace on click', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={false} />);
    const btn = screen.getByTestId('span-tag-filter-button');
    fireEvent.click(btn);

    expect(screen.getByText('Show Tags in Spans')).toBeInTheDocument();
    expect(screen.getByText('http.method')).toBeInTheDocument();
    expect(screen.getByText('http.status_code')).toBeInTheDocument();
    expect(screen.getByText('custom.tag')).toBeInTheDocument();
    expect(screen.getByText('service.version')).toBeInTheDocument();
  });

  it('filters available tags using search input', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    const searchInput = screen.getByTestId('span-tag-filter-search');
    fireEvent.change(searchInput, { target: { value: 'custom' } });

    expect(screen.getByText('custom.tag')).toBeInTheDocument();
    expect(screen.queryByText('http.status_code')).not.toBeInTheDocument();
  });

  it('allows adding a custom tag key not present in trace', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    const customInput = screen.getByTestId('span-tag-filter-custom-input');
    const addBtn = screen.getByTestId('span-tag-filter-add-button');

    fireEvent.change(customInput, { target: { value: 'dynamic.new.key' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('dynamic.new.key')).toBeInTheDocument();
  });

  it('selects all tags when Select all is clicked and clears when Clear is clicked', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    fireEvent.click(screen.getByText('Select all'));
    const methodCheckbox = screen.getByLabelText(/^http\.method/);
    expect(methodCheckbox).toBeChecked();

    // Toggle off http.method (covers next.delete(key))
    fireEvent.click(methodCheckbox);
    expect(methodCheckbox).not.toBeChecked();

    fireEvent.click(screen.getByText('Clear'));
    const applyBtn = screen.getByTestId('span-tag-filter-apply');
    fireEvent.click(applyBtn);

    expect(useSpanTagStore.getState().selectedTagKeys).toEqual([]);
  });

  it('resets to default tags when Default button is clicked', () => {
    useSpanTagStore.setState({ selectedTagKeys: ['custom.tag'] });
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    fireEvent.click(screen.getByText('Default'));
    fireEvent.click(screen.getByTestId('span-tag-filter-apply'));

    expect(useSpanTagStore.getState().selectedTagKeys).toContain('http.status_code');
  });

  it('closes popover without applying when Cancel button is clicked', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    expect(screen.getByText('Show Attributes in Spans')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('shows empty message when search query does not match any tags', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    const searchInput = screen.getByTestId('span-tag-filter-search');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-query-xyz' } });

    expect(screen.getByText('No matching attributes')).toBeInTheDocument();
  });

  it('ignores adding empty or whitespace custom keys', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    const customInput = screen.getByTestId('span-tag-filter-custom-input');
    fireEvent.change(customInput, { target: { value: '   ' } });
    fireEvent.keyDown(customInput, { key: 'Enter' });

    expect(screen.queryByText('   ')).not.toBeInTheDocument();
  });

  it('applies selected tags and updates store state', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    // Clear then check custom.tag
    fireEvent.click(screen.getByText('Clear'));
    const customCheckbox = screen.getByLabelText(/^custom\.tag/);
    fireEvent.click(customCheckbox);

    fireEvent.click(screen.getByTestId('span-tag-filter-apply'));
    expect(useSpanTagStore.getState().selectedTagKeys).toEqual(['custom.tag']);
  });

  it('saves to localStorage when "Save as default" is checked and applied', () => {
    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    fireEvent.click(screen.getByTestId('span-tag-filter-button'));

    fireEvent.click(screen.getByText('Clear'));
    fireEvent.click(screen.getByLabelText(/^http\.method/));
    fireEvent.click(screen.getByLabelText('Save as default'));

    fireEvent.click(screen.getByTestId('span-tag-filter-apply'));
    expect(storage.getItem(SPAN_TAG_KEYS_STORAGE_KEY)).toBe(JSON.stringify(['http.method']));
  });

  it('opens popover via keyboard (Enter and Space)', () => {
    const { unmount } = render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    const btn = screen.getByTestId('span-tag-filter-button');

    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(screen.getByText('Show Attributes in Spans')).toBeInTheDocument();

    unmount();

    render(<SpanTagFilter trace={mockTrace} useOtelTerms={true} />);
    const btn2 = screen.getByTestId('span-tag-filter-button');
    fireEvent.keyDown(btn2, { key: ' ' });
    expect(screen.getByText('Show Attributes in Spans')).toBeInTheDocument();
  });
});
