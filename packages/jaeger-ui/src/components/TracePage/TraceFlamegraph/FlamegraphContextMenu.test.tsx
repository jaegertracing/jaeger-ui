// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlamegraphContextMenu from './FlamegraphContextMenu';

describe('<FlamegraphContextMenu />', () => {
  const defaultProps = {
    x: 100,
    y: 200,
    onReset: vi.fn(),
    onCollapseAbove: vi.fn(),
    onCopyName: vi.fn(),
    onHighlightSimilar: vi.fn(),
    onClose: vi.fn(),
    isDirty: true,
    chartZoomed: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all menu items', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    expect(screen.getByText('Reset View')).toBeInTheDocument();
    expect(screen.getByText('Collapse nodes above')).toBeInTheDocument();
    expect(screen.getByText('Copy function name')).toBeInTheDocument();
    expect(screen.getByText('Highlight similar nodes')).toBeInTheDocument();
  });

  it('positions the menu at x, y', () => {
    const { container } = render(<FlamegraphContextMenu {...defaultProps} />);
    const menu = container.querySelector('.Flamegraph-context-menu');
    expect(menu).toHaveStyle({ left: '100px', top: '200px' });
  });

  it('disables Reset View when isDirty is false', () => {
    render(<FlamegraphContextMenu {...defaultProps} isDirty={false} />);
    expect(screen.getByText('Reset View').closest('button')).toBeDisabled();
  });

  it('disables Collapse nodes above when chartZoomed is false', () => {
    render(<FlamegraphContextMenu {...defaultProps} chartZoomed={false} />);
    expect(screen.getByText('Collapse nodes above').closest('button')).toBeDisabled();
  });

  it('calls onReset when Reset View is clicked', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Reset View'));
    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('calls onCollapseAbove when Collapse nodes above is clicked', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Collapse nodes above'));
    expect(defaultProps.onCollapseAbove).toHaveBeenCalled();
  });

  it('calls onCopyName when Copy function name is clicked', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Copy function name'));
    expect(defaultProps.onCopyName).toHaveBeenCalled();
  });

  it('calls onHighlightSimilar when Highlight similar nodes is clicked', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Highlight similar nodes'));
    expect(defaultProps.onHighlightSimilar).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.mouseDown(document);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside menu', () => {
    render(<FlamegraphContextMenu {...defaultProps} />);
    const menu = screen.getByText('Reset View').closest('.Flamegraph-context-menu')!;
    fireEvent.mouseDown(menu);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
