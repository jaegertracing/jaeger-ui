// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import JaegerAPI from '../api/jaeger';
import { toApiError } from '../types/api-error';
import { ErrorTraceArchive, LoadingTraceArchive, TraceArchive } from '../types/archive';

type ArchiveStore = {
  archives: Record<string, TraceArchive>;
  submitTraceToArchive: (traceId: string) => Promise<void>;
  acknowledge: (traceId: string) => void;
};

export const useArchiveStore = create<ArchiveStore>((set, _get) => ({
  archives: {},

  submitTraceToArchive: async (traceId: string) => {
    set(s => ({
      archives: { ...s.archives, [traceId]: { isArchiving: true } satisfies LoadingTraceArchive },
    }));
    try {
      await JaegerAPI.archiveTrace(traceId);
      set(s => ({
        archives: { ...s.archives, [traceId]: { isArchived: true, isAcknowledged: false } },
      }));
    } catch (caught) {
      set(s => ({
        archives: {
          ...s.archives,
          [traceId]: {
            error: toApiError(caught),
            isArchived: false,
            isError: true,
            isAcknowledged: false,
          } satisfies ErrorTraceArchive,
        },
      }));
    }
  },

  // Marks the archive outcome as dismissed: called when the user closes the result
  // notification, preventing it from reappearing on re-render.
  acknowledge: (traceId: string) => {
    set(s => {
      const traceArchive = s.archives[traceId];
      if (!traceArchive || ('isArchiving' in traceArchive && traceArchive.isArchiving)) {
        return s;
      }
      return {
        archives: { ...s.archives, [traceId]: { ...traceArchive, isAcknowledged: true } },
      };
    });
  },
}));
