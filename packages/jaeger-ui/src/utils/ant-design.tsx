// Copyright (c) 2020 The Jaeger Authors
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

import { DefaultOptionType } from 'antd/lib/select';

/**
 * This enables search by label in Ant Design's Select component (v4.x)
 *
 * Pass this to the `filterOption` prop with `showSearch` prop set to `true`
 *
 * @example
 * ```
 * <Select {...props} filterOption={antSelectSearchByLabel} showSearch={true} />
 * ```
 */
// eslint-disable-next-line import/prefer-default-export
export function antSelectSearchByLabel(input: string, option?: DefaultOptionType) {
  return (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase());
}
