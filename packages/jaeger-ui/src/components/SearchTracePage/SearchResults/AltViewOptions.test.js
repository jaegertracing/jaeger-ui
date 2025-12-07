// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import AltViewOptions from './AltViewOptions';
import * as url from '../../DeepDependencies/url';
import * as getConfig from '../../../utils/config/get-config';
import * as trackingModule from './index.track';

describe('AltViewOptions', () => {
  let getConfigValueSpy;
  let getUrlSpy;
  let getUrlStateSpy;
  let openSpy;
  let trackConversionsSpy;

  const props = {
    traceResultsView: true,
    onDdgViewClicked: jest.fn(),
  };

  beforeAll(() => {
    getUrlSpy = jest.spyOn(url, 'getUrl');
    getUrlStateSpy = jest.spyOn(url, 'getUrlState');
    getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
    trackConversionsSpy = jest.spyOn(trackingModule, 'trackConversions');
    openSpy = jest.spyOn(window, 'open').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    openSpy.mockRestore();
  });

  it('renders correct label', () => {
    const { rerender } = render(<AltViewOptions {...props} />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();

    rerender(<AltViewOptions {...props} traceResultsView={false} />);
    expect(screen.getByText('Trace Results')).toBeInTheDocument();
  });

  it('renders button to view full ddg iff ddg is enabled and search results are viewed as ddg', () => {
    const { rerender } = render(<AltViewOptions {...props} />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();
    expect(screen.queryByText('View All Dependencies')).not.toBeInTheDocument();

    getConfigValueSpy.mockReturnValue(true);
    rerender(<AltViewOptions {...props} traceResultsView={false} />);
    expect(screen.getByText('Trace Results')).toBeInTheDocument();
    expect(screen.getByText('View All Dependencies')).toBeInTheDocument();

    rerender(<AltViewOptions {...props} traceResultsView />);
    expect(screen.getByText('Deep Dependency Graph')).toBeInTheDocument();
    expect(screen.queryByText('View All Dependencies')).not.toBeInTheDocument();
  });

  it('opens correct ddg url with correct target when view full ddg button is clicked', () => {
    const mockUrl = 'test url';
    const mockUrlState = { service: 'serviceName', showOp: true };

    getConfigValueSpy.mockReturnValue(true);
    getUrlSpy.mockReturnValue(mockUrl);
    getUrlStateSpy.mockReturnValue(mockUrlState);

    render(<AltViewOptions {...props} traceResultsView={false} />);
    fireEvent.click(screen.getByText('View All Dependencies'));
    expect(getUrlSpy).toHaveBeenLastCalledWith(mockUrlState);
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_self');

    fireEvent.click(screen.getByText('View All Dependencies'), { ctrlKey: true });
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_blank');

    fireEvent.click(screen.getByText('View All Dependencies'), { metaKey: true });
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_blank');
  });
});
