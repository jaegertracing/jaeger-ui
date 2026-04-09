// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import embeddedConfig from './embedded';
import { getEmbeddedState } from '../utils/embedded-url';

vi.mock('../utils/embedded-url', () => ({
  getEmbeddedState: vi.fn(),
}));

const mockGetEmbeddedState = vi.mocked(getEmbeddedState);

describe('embeddedConfig', () => {
  beforeEach(() => {
    mockGetEmbeddedState.mockReset();
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true,
    });
  });

  it('returns the existing state unchanged when state is defined', () => {
    const existingState = {
      version: 'v0' as const,
      searchHideGraph: false,
      timeline: { collapseTitle: false, hideMinimap: false, hideSummary: false },
    };

    expect(embeddedConfig(existingState)).toBe(existingState);
    expect(mockGetEmbeddedState).not.toHaveBeenCalled();
  });

  it('returns null when state is undefined and window.location.search is empty', () => {
    window.location = { search: '' } as Location;

    expect(embeddedConfig(undefined)).toBeNull();
    expect(mockGetEmbeddedState).not.toHaveBeenCalled();
  });

  it('calls getEmbeddedState with the search string when state is undefined and search is present', () => {
    const search = '?uiEmbed=v0';
    const embeddedState = {
      version: 'v0' as const,
      searchHideGraph: true,
      timeline: { collapseTitle: false, hideMinimap: false, hideSummary: false },
    };
    window.location = { search } as Location;
    mockGetEmbeddedState.mockReturnValue(embeddedState);

    expect(embeddedConfig(undefined)).toBe(embeddedState);
    expect(mockGetEmbeddedState).toHaveBeenCalledWith(search);
  });

  it('returns null when getEmbeddedState returns null (unrecognised embed version)', () => {
    window.location = { search: '?uiEmbed=v999' } as Location;
    mockGetEmbeddedState.mockReturnValue(null);

    expect(embeddedConfig(undefined)).toBeNull();
  });
});
