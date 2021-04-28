// Copyright (c) 2017 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { KeyValuePair, Span } from '../types/trace';
import { getConfigValue } from '../utils/config/get-config';

/**
 * Searches the span.references to find 'CHILD_OF' reference type or returns null.
 * @param  {Span} span The span whose parent is to be returned.
 * @return {Span|null} The parent span if there is one, null otherwise.
 */
// eslint-disable-next-line import/prefer-default-export
export function getParent(span: Span) {
  const parentRef = span.references ? span.references.find(ref => ref.refType === 'CHILD_OF') : null;
  return parentRef ? parentRef.span : null;
}

/** Shape of data required to determine a span's group. */
type SpanGroupData = {
  process: {
    serviceName: string;
    tags: Array<KeyValuePair>;
  };
  tags: Array<KeyValuePair>;
};

/**
 * Generates a group for the span that can be used when determining which
 * colour it should have, how many distinct groups of spans exist, and so on.
 *
 * The group is determined from the `spanGroupKey` configuration object, with
 * properties:
 *
 * - `preset` (string) - set the fields according to presets designed to work with
 *   conventions adopted by different projects.
 *
 * - `tags` (string[]) - set the group according to the values of the tags
 *   listed in this array. Process tags are searched first, followed by span
 *   tags. The special value `serviceName` corresponds to the service's name.
 *
 * If `preset` is specified then `tags` is ignored.
 *
 * # Available presets
 *
 * - {@link https://github.com/open-telemetry/opentelemetry-specification/blob/ef4612dd0b1f4266e6eca7177290ee2a5f087199/specification/resource/semantic_conventions/README.md|otel-ef4612d},
 *   the *experimental* OpenTelemetry semantic conventions at commit SHA
 *   ef4612d. Equivalent to setting
 *   `tags: ['serviceName', 'service.namespace', 'service.instance.id]`.
 *
 * # Default
 *
 * If no configuration value is provided the default is to use `serviceName`.
 *
 * @param {Span} span The span to determine the group for
 */
export function getSpanGroupFromSpan(span: SpanGroupData) {
  let groupKeyFields = [];

  const preset = getConfigValue('spanGroupKey.preset');
  if (preset !== undefined) {
    switch (preset) {
      case 'otel-ef4612d':
        groupKeyFields = ['serviceName', 'service.namespace', 'service.instance.id'];
        break;
      default:
        // Give the user a chance to discover the problem
        // eslint-disable-next-line no-console
        console.warn(`Unknown value '${preset}' for 'spanGroupKey.preset' config option`);
        break;
    }
  }

  if (groupKeyFields.length === 0) {
    groupKeyFields = getConfigValue('spanGroupKey.tags') || ['serviceName'];
  }

  const fieldValues: string[] = [];

  groupKeyFields.forEach((field: string) => {
    if (field === 'serviceName') {
      fieldValues.push(span.process.serviceName);
      return;
    }

    let kv = span.process.tags.find(kv => kv.key === field);
    if (kv && kv.value !== undefined) {
      fieldValues.push(kv.value);
      return;
    }

    kv = span.tags.find(kv => kv.key === field);
    if (kv && kv.value !== undefined) {
      fieldValues.push(kv.value);
      return;
    }

    // Add an empty field so it still shows up in the UI
    fieldValues.push('');
  });

  return fieldValues.join(':');
}
