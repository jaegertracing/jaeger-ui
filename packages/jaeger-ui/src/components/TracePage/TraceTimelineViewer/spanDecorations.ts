// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import {
  IoServer as DbIcon,
  IoGlobe as HttpIcon,
  IoChatbubble as MessagingIcon,
  IoSwapHorizontalOutline as RpcIcon,
} from 'react-icons/io5';

/**
 * Shared span decoration registry.
 *
 * Icons and pills derive signals from the same attribute families; they only
 * differ in outcome:
 * - icon: namespace presence → one category glyph (priority when several match)
 * - pill: specific keys → attribute value (only when it adds info the icon cannot)
 *
 * Rules encoded here:
 * - No pill for a pure category signal already covered by an icon (e.g. span.kind).
 * - gen_ai is omitted: GenAISpanIcon + classifySpan handle GenAI (#4217).
 * - messaging has an icon but no pill yet; messaging.system is a follow-up.
 */

export type IPillSource = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

export type INamespaceIcon = {
  namespace: string;
  icon: IconType;
  /** Lower wins when a span matches multiple namespaces. */
  priority: number;
};

export type IDecorationFamily = {
  namespace: string;
  icon: IconType;
  /** Lower wins when a span matches multiple namespaces. */
  iconPriority: number;
  /**
   * Value-bearing pills for this family. Empty means icon-only for now.
   * Pill emission order is {@link PILL_SOURCES}, not iconPriority order.
   */
  pills: readonly IPillSource[];
};

const HTTP_STATUS_PILL: IPillSource = {
  label: 'http.status_code',
  attrKeys: ['http.status_code', 'http.response.status_code'],
  isError: value => {
    const code = Number(value.trim());
    return code >= 500 && code < 600;
  },
};

const HTTP_METHOD_PILL: IPillSource = {
  label: 'http.method',
  attrKeys: ['http.method', 'http.request.method'],
};

const DB_SYSTEM_PILL: IPillSource = {
  label: 'db.system',
  attrKeys: ['db.system'],
};

const RPC_SYSTEM_PILL: IPillSource = {
  label: 'rpc.system',
  attrKeys: ['rpc.system'],
};

/** One entry per attribute family that participates in timeline decorations. */
export const DECORATION_FAMILIES: readonly IDecorationFamily[] = [
  {
    namespace: 'db',
    icon: DbIcon,
    iconPriority: 1,
    pills: [DB_SYSTEM_PILL],
  },
  {
    namespace: 'http',
    icon: HttpIcon,
    iconPriority: 2,
    pills: [HTTP_STATUS_PILL, HTTP_METHOD_PILL],
  },
  {
    namespace: 'messaging',
    icon: MessagingIcon,
    iconPriority: 3,
    // Follow-up: messaging.system pill (same value-add as db.system / rpc.system).
    pills: [],
  },
  {
    namespace: 'rpc',
    icon: RpcIcon,
    iconPriority: 4,
    pills: [RPC_SYSTEM_PILL],
  },
];

/** Namespace → icon lookups derived from {@link DECORATION_FAMILIES}. */
export const NAMESPACE_ICONS: readonly INamespaceIcon[] = DECORATION_FAMILIES.map(
  ({ namespace, icon, iconPriority }) => ({
    namespace,
    icon,
    priority: iconPriority,
  })
);

/**
 * Pill sources in emission order (stable UI order; independent of iconPriority).
 * Built from the same pill definitions attached to {@link DECORATION_FAMILIES}.
 */
export const PILL_SOURCES: readonly IPillSource[] = [
  HTTP_STATUS_PILL,
  HTTP_METHOD_PILL,
  DB_SYSTEM_PILL,
  RPC_SYSTEM_PILL,
];
