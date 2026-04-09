// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import JaegerAPI from '../api/jaeger';
import { useArchiveStore } from './archive-store';

vi.mock('../api/jaeger', () => ({
  default: {
    archiveTrace: vi.fn(),
  },
}));

describe('archive-store', () => {
  const mockArchiveTrace = vi.mocked(JaegerAPI.archiveTrace);

  beforeEach(() => {
    useArchiveStore.setState({ archives: {} });
    mockArchiveTrace.mockReset();
  });

  describe('submitArchiveTrace', () => {
    it('sets isLoading then isArchived on success', async () => {
      mockArchiveTrace.mockResolvedValue({});

      const states: object[] = [];
      const unsub = useArchiveStore.subscribe(s => states.push({ ...s.archives }));

      await useArchiveStore.getState().submitArchiveTrace('trace-1');
      unsub();

      expect(states).toEqual([
        { 'trace-1': { isLoading: true } },
        { 'trace-1': { isArchived: true, isAcknowledged: false } },
      ]);
    });

    it('sets isLoading then error state on failure', async () => {
      const err = new Error('API error');
      mockArchiveTrace.mockRejectedValue(err);

      const states: object[] = [];
      const unsub = useArchiveStore.subscribe(s => states.push({ ...s.archives }));

      await useArchiveStore.getState().submitArchiveTrace('trace-1');
      unsub();

      expect(states).toEqual([
        { 'trace-1': { isLoading: true } },
        {
          'trace-1': {
            error: { message: 'API error' },
            isArchived: false,
            isError: true,
            isAcknowledged: false,
          },
        },
      ]);
    });

    it('normalizes string rejections to ApiError string', async () => {
      mockArchiveTrace.mockRejectedValue('plain string failure');

      await useArchiveStore.getState().submitArchiveTrace('trace-1');

      expect(useArchiveStore.getState().archives['trace-1']).toEqual({
        error: 'plain string failure',
        isArchived: false,
        isError: true,
        isAcknowledged: false,
      });
    });

    it('preserves existing archive entries for other traces', async () => {
      mockArchiveTrace.mockResolvedValue({});
      useArchiveStore.setState({ archives: { 'trace-other': { isArchived: true, isAcknowledged: true } } });

      await useArchiveStore.getState().submitArchiveTrace('trace-1');

      const { archives } = useArchiveStore.getState();
      expect(archives['trace-other']).toEqual({ isArchived: true, isAcknowledged: true });
      expect(archives['trace-1']).toEqual({ isArchived: true, isAcknowledged: false });
    });
  });

  describe('acknowledge', () => {
    it('sets isAcknowledged to true on a successful archive', () => {
      useArchiveStore.setState({
        archives: { 'trace-1': { isArchived: true, isAcknowledged: false } },
      });

      useArchiveStore.getState().acknowledge('trace-1');

      expect(useArchiveStore.getState().archives['trace-1']).toEqual({
        isArchived: true,
        isAcknowledged: true,
      });
    });

    it('sets isAcknowledged to true on an error archive', () => {
      useArchiveStore.setState({
        archives: {
          'trace-1': { error: { message: 'fail' }, isArchived: false, isError: true, isAcknowledged: false },
        },
      });

      useArchiveStore.getState().acknowledge('trace-1');

      expect(useArchiveStore.getState().archives['trace-1']).toEqual({
        error: { message: 'fail' },
        isArchived: false,
        isError: true,
        isAcknowledged: true,
      });
    });

    it('does not update state when trace is still loading', () => {
      useArchiveStore.setState({ archives: { 'trace-1': { isLoading: true } } });
      const before = useArchiveStore.getState().archives;

      useArchiveStore.getState().acknowledge('trace-1');

      expect(useArchiveStore.getState().archives).toBe(before);
    });

    it('does not update state when trace is not in archives', () => {
      const before = useArchiveStore.getState().archives;

      useArchiveStore.getState().acknowledge('trace-missing');

      expect(useArchiveStore.getState().archives).toBe(before);
    });
  });
});
