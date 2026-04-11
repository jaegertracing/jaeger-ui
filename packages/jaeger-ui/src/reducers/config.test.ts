// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import reduceConfig from './config';
import getConfig from '../utils/config/get-config';

vi.mock('../utils/config/get-config', () => ({
  default: vi.fn(),
}));

const mockGetConfig = vi.mocked(getConfig);

describe('reduceConfig', () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
  });

  it('returns the result of getConfig() when state is undefined', () => {
    const config = { archiveEnabled: false } as any;
    mockGetConfig.mockReturnValue(config);

    expect(reduceConfig(undefined)).toBe(config);
    expect(mockGetConfig).toHaveBeenCalledOnce();
  });

  it('returns the existing state unchanged when state is defined', () => {
    const existingState = { archiveEnabled: true } as any;

    expect(reduceConfig(existingState)).toBe(existingState);
    expect(mockGetConfig).not.toHaveBeenCalled();
  });
});
