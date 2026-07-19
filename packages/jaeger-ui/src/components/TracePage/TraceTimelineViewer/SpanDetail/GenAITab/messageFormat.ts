// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import storage from '../../../../../utils/storage';

// Message text has no declared format in the OTel GenAI conventions - it can be prose,
// Markdown, JSON, code, or a template. Per review discussion, the format is not assumed:
// content that parses as JSON defaults to the tree view, everything else defaults to
// plain text, and the user can override per attribute via the dropdown. The override is
// remembered per attribute name (not globally, and not per-message), so e.g. a user's
// choice for gen_ai.output.messages applies to every output message.
export type MessageFormat = 'plain' | 'markdown' | 'json';

const MESSAGE_FORMAT_STORAGE_PREFIX = 'jaeger.genaiTab.messageFormat.';

// Above this length, Markdown parsing is skipped even if selected - avoids pathological
// reflow/parse cost on huge attributes. Plain text and the JSON tree view have no such
// cap since neither does Markdown's block-level reparsing.
export const MARKDOWN_SIZE_LIMIT = 150_000;

export function readStoredMessageFormat(attributeKey: string): MessageFormat | null {
  const stored = storage.getString(MESSAGE_FORMAT_STORAGE_PREFIX + attributeKey);
  return stored === 'plain' || stored === 'markdown' || stored === 'json' ? stored : null;
}

export function writeStoredMessageFormat(attributeKey: string, format: MessageFormat): void {
  storage.set(MESSAGE_FORMAT_STORAGE_PREFIX + attributeKey, format);
}
