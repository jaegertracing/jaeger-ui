// Copyright (c) 2021 The Jaeger Authors.
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

import _get from 'lodash/get';
import { KeyValuePair } from '../types/trace';
import * as getConfig from '../utils/config/get-config';
import { getSpanGroupFromSpan } from './span';

describe('getSpanGroupFromSpan', () => {
  let getConfigValueSpy;

  /** Makes span data with the given serviceName, processTags, and tags */
  const mkSpan = (serviceName: string, processTags: Array<KeyValuePair>, tags: Array<KeyValuePair>) => {
    return {
      process: {
        serviceName,
        tags: processTags,
      },
      tags,
    };
  };

  /** Factory for getConfigValue that queries the provided configuation */
  const getConfigValueFactory = (config: { spanGroupKey: { preset?: string; tags?: string[] } }) => (
    key: string
  ) => _get(config, key);

  /** Helper to create KeyValuePair */
  const kv = (key: string, value: any): KeyValuePair => {
    return { key, value };
  };

  beforeAll(() => {
    getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
  });

  it('uses serviceName if no "preset" or "tags" keys are present', () => {
    getConfigValueSpy.mockReturnValue(undefined);
    const span = mkSpan('some-service', [], []);
    expect(getSpanGroupFromSpan(span)).toBe('some-service');
  });

  it('prefers "preset" to "tags"', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          preset: 'otel-ef4612d',
          tags: ['serviceName'],
        },
      })
    );

    const span = mkSpan(
      'some-service',
      [kv('service.namespace', 'foo'), kv('service.instance.id', 'bar')],
      []
    );
    expect(getSpanGroupFromSpan(span)).toBe('some-service:foo:bar');
  });

  it('uses "tags" if the preset is unknown and "tags" is present"', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          preset: 'bogus-preset',
          tags: ['some-tag'],
        },
      })
    );

    const span = mkSpan('some-service', [kv('some-tag', 'foo')], []);
    expect(getSpanGroupFromSpan(span)).toBe('foo');
  });

  it('uses "serviceName" if the preset is unknown and no "tags" are present', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          preset: 'bogus-preset',
        },
      })
    );
    const span = mkSpan('some-service', [kv('some-tag', 'foo')], []);
    expect(getSpanGroupFromSpan(span)).toBe('some-service');
  });

  it('handles explicit "serviceName" as a tag', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          tags: ['serviceName'],
        },
      })
    );

    const span = mkSpan('some-service', [kv('some-tag', 'foo')], []);
    expect(getSpanGroupFromSpan(span)).toBe('some-service');
  });

  it('handles multiple tags', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          tags: ['serviceName', 'service.namespace', 'service.instance.id'],
        },
      })
    );

    const span = mkSpan(
      'some-service',
      [kv('service.namespace', 'foo'), kv('service.instance.id', 'bar')],
      []
    );
    expect(getSpanGroupFromSpan(span)).toBe('some-service:foo:bar');
  });

  it('includes missing values in the group key', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          tags: ['serviceName', 'service.namespace', 'service.instance.id'],
        },
      })
    );

    const span = mkSpan('some-service', [kv('service.instance.id', 'bar')], []);
    // service.namespace is missing from the span tags, represented by '::'
    // in the expected result
    expect(getSpanGroupFromSpan(span)).toBe('some-service::bar');
  });

  it('uses span tags if a process tag is missing', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          tags: ['serviceName', 'service.namespace', 'service.instance.id'],
        },
      })
    );

    const span = mkSpan('some-service', [kv('service.instance.id', 'bar')], [kv('service.namespace', 'foo')]);
    expect(getSpanGroupFromSpan(span)).toBe('some-service:foo:bar');
  });

  it('prefers process tags to span tags if they have the same name', () => {
    getConfigValueSpy.mockImplementation(
      getConfigValueFactory({
        spanGroupKey: {
          tags: ['serviceName', 'service.namespace'],
        },
      })
    );
    const span = mkSpan('some-service', [kv('service.namespace', 'foo')], [kv('service.namespace', 'bar')]);
    expect(getSpanGroupFromSpan(span)).toBe('some-service:foo');
  });
});
