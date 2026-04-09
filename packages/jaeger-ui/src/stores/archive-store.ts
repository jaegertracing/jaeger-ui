// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import JaegerAPI from '../api/jaeger';
import { ApiError } from '../types/api-error';
import { TraceArchive } from '../types/archive';

export type ArchiveStore = {
  archives: Record<string, TraceArchive>;
  submitArchiveTrace: (traceId: string) => Promise<void>;
  acknowledge: (traceId: string) => void;
};

export const useArchiveStore = create<ArchiveStore>((set, _get) => ({
  archives: {},

  submitArchiveTrace: async (traceId: string) => {
    set(s => ({ archives: { ...s.archives, [traceId]: { isLoading: true } } }));
    try {
      await JaegerAPI.archiveTrace(traceId);
      set(s => ({
        archives: { ...s.archives, [traceId]: { isArchived: true, isAcknowledged: false } },
      }));
    } catch (error) {
      set(s => ({
        archives: {
          ...s.archives,
          [traceId]: { error: error as ApiError, isArchived: false, isError: true, isAcknowledged: false },
        },
      }));
    }
  },

  acknowledge: (traceId: string) => {
    set(s => {
      const traceArchive = s.archives[traceId];
      if (!traceArchive || ('isLoading' in traceArchive && traceArchive.isLoading)) {
        return s;
      }
      return {
        archives: { ...s.archives, [traceId]: { ...traceArchive, isAcknowledged: true } },
      };
    });
  },
}));
