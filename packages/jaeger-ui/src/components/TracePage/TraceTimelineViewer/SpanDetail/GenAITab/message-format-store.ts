// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import storage from '../../../../../utils/storage';
import type { MessageFormat } from './messageFormat';

const MESSAGE_FORMAT_STORAGE_PREFIX = 'jaeger.genaiTab.messageFormat.';

// The closed set of attribute names ConversationSection assigns a format preference to.
// Listed here (rather than derived at runtime) so the store can hydrate synchronously at
// creation, matching search-panel-store.ts / store.layout.ts.
const MESSAGE_FORMAT_ATTRIBUTE_KEYS = [
  'gen_ai.system_instructions',
  'gen_ai.input.messages',
  'gen_ai.output.messages',
] as const;

function readStoredFormat(attributeKey: string): MessageFormat | null {
  const stored = storage.getString(MESSAGE_FORMAT_STORAGE_PREFIX + attributeKey);
  return stored === 'plain' || stored === 'markdown' || stored === 'json' ? stored : null;
}

type MessageFormatStore = {
  // The user's chosen format per attribute name; a missing key means no override, so
  // callers fall back to the content-derived default. Populated at creation from
  // localStorage and kept in sync by setFormat - components read this directly instead
  // of separately merging in-memory and persisted state.
  overrides: Partial<Record<string, MessageFormat>>;
  setFormat: (attributeKey: string, format: MessageFormat) => void;
};

export function getInitialState(): Pick<MessageFormatStore, 'overrides'> {
  const overrides: Partial<Record<string, MessageFormat>> = {};
  MESSAGE_FORMAT_ATTRIBUTE_KEYS.forEach(attributeKey => {
    const stored = readStoredFormat(attributeKey);
    if (stored) overrides[attributeKey] = stored;
  });
  return { overrides };
}

export const useMessageFormatStore = create<MessageFormatStore>()(set => ({
  ...getInitialState(),
  setFormat: (attributeKey: string, format: MessageFormat) => {
    storage.set(MESSAGE_FORMAT_STORAGE_PREFIX + attributeKey, format);
    set(state => ({ overrides: { ...state.overrides, [attributeKey]: format } }));
  },
}));
