// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, beforeAll, type MockInstance } from 'vite-plus/test';

import AltViewOptions from './AltViewOptions';
import * as url from '../../DeepDependencies/url';
import * as getConfig from '../../../utils/config/get-config';
import * as trackingModule from './index.track';
import defaultConfig from '../../../constants/default-config';
import { EDdgDensity } from '../../../model/ddg/types';
import type { Config } from '../../../types/config';

describe('AltViewOptions', () => {
  let getConfigValueSpy: MockInstance<() => Config>;
  let getUrlSpy: MockInstance<typeof url.getUrl>;
  let getUrlStateSpy: MockInstance<typeof url.getUrlState>;

  const defaultProps = {
    traceResultsView: true,
    onDdgViewClicked: vi.fn(),
  };

  beforeAll(() => {
    getUrlSpy = vi.spyOn(url, 'getUrl');
    getUrlStateSpy = vi.spyOn(url, 'getUrlState');
    getConfigValueSpy = vi.spyOn(getConfig, 'default');
    vi.spyOn(trackingModule, 'trackConversions');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correct label', () => {
    const { rerender } = render(<AltViewOptions {...defaultProps} />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();

    rerender(<AltViewOptions {...defaultProps} traceResultsView={false} />);
    expect(screen.getByText('Trace Results')).toBeInTheDocument();
  });

  it('renders button to view full ddg iff ddg is enabled and search results are viewed as ddg', () => {
    const { rerender } = render(<AltViewOptions {...defaultProps} />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();
    expect(screen.queryByText('View All Dependencies')).not.toBeInTheDocument();

    getConfigValueSpy.mockReturnValue({
      ...defaultConfig,
      deepDependencies: { menuEnabled: true },
    });
    rerender(<AltViewOptions {...defaultProps} traceResultsView={false} />);
    expect(screen.getByText('Trace Results')).toBeInTheDocument();
    expect(screen.getByText('View All Dependencies')).toBeInTheDocument();

    rerender(<AltViewOptions {...defaultProps} traceResultsView />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();
    expect(screen.queryByText('View All Dependencies')).not.toBeInTheDocument();
  });

  it('opens correct ddg url with correct target when view full ddg button is clicked', () => {
    const mockUrl = 'test url';
    const mockUrlState = {
      density: EDdgDensity.PreventPathEntanglement,
      service: 'serviceName',
      showOp: true,
    };

    getConfigValueSpy.mockReturnValue({
      ...defaultConfig,
      deepDependencies: { menuEnabled: true },
    });
    getUrlSpy.mockReturnValue(mockUrl);
    getUrlStateSpy.mockReturnValue(mockUrlState);

    render(<AltViewOptions {...defaultProps} traceResultsView={false} />);
    fireEvent.click(screen.getByText('View All Dependencies'));
    expect(getUrlSpy).toHaveBeenLastCalledWith(mockUrlState);
    expect(window.open).toHaveBeenLastCalledWith(mockUrl, '_self');

    fireEvent.click(screen.getByText('View All Dependencies'), { ctrlKey: true });
    expect(window.open).toHaveBeenLastCalledWith(mockUrl, '_blank');

    fireEvent.click(screen.getByText('View All Dependencies'), { metaKey: true });
    expect(window.open).toHaveBeenLastCalledWith(mockUrl, '_blank');
  });

  it('calls onDdgViewClicked when the toggle button is clicked', () => {
    const onDdgViewClicked = vi.fn();
    const { rerender } = render(
      <AltViewOptions traceResultsView={true} onDdgViewClicked={onDdgViewClicked} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deep Dependency Graph' }));
    expect(onDdgViewClicked).toHaveBeenCalledTimes(1);

    rerender(<AltViewOptions traceResultsView={false} onDdgViewClicked={onDdgViewClicked} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trace Results' }));
    expect(onDdgViewClicked).toHaveBeenCalledTimes(2);
  });
});
