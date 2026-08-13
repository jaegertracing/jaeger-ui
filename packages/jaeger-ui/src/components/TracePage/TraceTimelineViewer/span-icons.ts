// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Namespace icon lookup. Prefer {@link getSpanDecorationIcon} for row rendering
 * so GenAI and namespace icons never compete (#4217).
 */
export { getNamespaceIconComponent as getSpanIconComponent } from './spanDecorations';
