// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, queryOptions, skipToken, useQueries, useQueryClient } from '@tanstack/react-query';
import _get from 'lodash/get';
import queryString from 'query-string';

import { jaegerClient } from '../api/v3/client';
import { TPadEntry } from '../model/path-agnostic-decorations/types';
import { useConfig } from './useConfig';
import stringSupplant from '../utils/stringSupplant';

async function fetchSummary(
  client: QueryClient,
  url: string,
  path: string,
  maximumKey: readonly string[]
): Promise<TPadEntry> {
  let value: TPadEntry;
  try {
    // Different services and decorations can extract different paths from one response.
    const response = await client.fetchQuery({
      queryKey: ['decoration-response', url],
      queryFn: () => jaegerClient.fetchDecoration(url),
      staleTime: Infinity,
      retry: false,
    });
    value = _get(response, path, `\`${path}\` not found in response`);
  } catch (error) {
    value = `Unable to fetch decoration: ${(error as Error)?.message || error}`;
  }
  // The maximum is the largest numeric value seen for this scope and tier during the session.
  // Update it once per response so readers observe a number instead of scanning every summary query.
  if (typeof value === 'number' && value > (client.getQueryData<number>(maximumKey) ?? -Infinity)) {
    client.setQueryData(maximumKey, value);
  }
  return value;
}

export default function usePathAgnosticDecoration({
  service,
  operation,
  search = '',
}: {
  service: string;
  operation?: string | string[] | null;
  search?: string;
}) {
  const client = useQueryClient();
  const { decoration } = queryString.parse(search);
  const decorationID = (Array.isArray(decoration) ? decoration[0] : decoration) || undefined;
  const schema = useConfig().pathAgnosticDecorations?.find(s => s.id === decorationID);
  const op = typeof operation === 'string' ? operation : undefined;
  const withOp = Boolean(op && schema?.opSummaryUrl && schema.opSummaryPath);
  // Include the config in the key so a reused ID cannot expose values from another endpoint.
  const scopeKey = JSON.stringify([
    decorationID,
    schema?.summaryUrl,
    schema?.summaryPath,
    schema?.opSummaryUrl,
    schema?.opSummaryPath,
  ]);
  const tiers = withOp ? ['withOp', 'withoutOp'] : ['withoutOp'];
  const summaries = useQueries({
    queries: tiers.map(tier => {
      const isOperation = tier === 'withOp';
      const url =
        schema &&
        stringSupplant(isOperation ? schema.opSummaryUrl! : schema.summaryUrl, {
          service,
          operation: op,
        });
      const path =
        schema &&
        stringSupplant(isOperation ? schema.opSummaryPath! : schema.summaryPath, {
          service,
          operation: op,
        });
      return {
        queryKey: ['decoration-summary', scopeKey, tier, service, isOperation ? op : undefined],
        queryFn: () => fetchSummary(client, url!, path!, ['decoration-maximum', scopeKey, tier]),
        enabled: Boolean(schema) && (isOperation || !withOp),
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
      };
    }),
  });
  const maxima = useQueries({
    queries: tiers.map(tier =>
      queryOptions<number>({
        queryKey: ['decoration-maximum', scopeKey, tier],
        queryFn: skipToken,
        initialData: -Infinity,
        staleTime: Infinity,
        gcTime: Infinity,
      })
    ),
  });
  const serviceIndex = tiers.length - 1;
  const operationValue = withOp ? summaries[0].data : undefined;
  // Falsy operation values fall back to a cached service value.
  return {
    decorationID,
    decorationValue: operationValue || summaries[serviceIndex].data,
    decorationMax: maxima[operationValue ? 0 : serviceIndex].data,
  };
}
