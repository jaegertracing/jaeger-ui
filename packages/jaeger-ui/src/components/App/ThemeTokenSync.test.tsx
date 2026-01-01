// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { theme } from 'antd';
import { ThemeTokenSync } from './ThemeTokenSync';

jest.mock('antd', () => ({
  theme: {
    useToken: jest.fn(),
  },
}));

describe('ThemeTokenSync', () => {
  let setPropertySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty');
  });

  afterEach(() => {
    setPropertySpy.mockRestore();
  });

  it('syncs design tokens to CSS variables on :root', () => {
    const mockTokens = {
      colorBgContainer: '#ffffff',
      colorPrimary: '#1890ff',
      fontSize: 14,
      borderRadius: 4,
    };

    (theme.useToken as jest.Mock).mockReturnValue({ token: mockTokens });

    render(<ThemeTokenSync />);

    expect(setPropertySpy).toHaveBeenCalledWith('--ant-color-bg-container', '#ffffff');
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-color-primary', '#1890ff');
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-font-size', '14');
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-border-radius', '4');
    expect(setPropertySpy).toHaveBeenCalledTimes(4);
  });

  it('handles camelCase to kebab-case conversion correctly', () => {
    const mockTokens = {
      someLongCamelCaseToken: 'value',
    };

    (theme.useToken as jest.Mock).mockReturnValue({ token: mockTokens });

    render(<ThemeTokenSync />);

    expect(setPropertySpy).toHaveBeenCalledWith('--ant-some-long-camel-case-token', 'value');
  });

  it('ignores nested objects and only syncs strings and numbers', () => {
    const mockTokens = {
      validString: 'hello',
      validNumber: 123,
      invalidObject: { some: 'nested' },
      invalidArray: [1, 2, 3],
      invalidNull: null,
      invalidUndefined: undefined,
    };

    (theme.useToken as jest.Mock).mockReturnValue({ token: mockTokens });

    render(<ThemeTokenSync />);

    expect(setPropertySpy).toHaveBeenCalledWith('--ant-valid-string', 'hello');
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-valid-number', '123');
    // Only 2 should be called (string and number)
    expect(setPropertySpy).toHaveBeenCalledTimes(2);
  });

  it('updates CSS variables when tokens change', () => {
    const { rerender } = render(<ThemeTokenSync />);

    const tokens1 = { colorPrimary: 'blue' };
    (theme.useToken as jest.Mock).mockReturnValue({ token: tokens1 });
    rerender(<ThemeTokenSync />);
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-color-primary', 'blue');

    setPropertySpy.mockClear();

    const tokens2 = { colorPrimary: 'red' };
    (theme.useToken as jest.Mock).mockReturnValue({ token: tokens2 });
    rerender(<ThemeTokenSync />);
    expect(setPropertySpy).toHaveBeenCalledWith('--ant-color-primary', 'red');
  });
});
