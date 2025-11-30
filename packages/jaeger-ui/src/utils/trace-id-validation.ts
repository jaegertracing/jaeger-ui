// Copyright (c) 2020 The Jaeger Authors.
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

import { ValidateError } from '../types/validate-error';

export function validateTraceId(traceId: string): ValidateError | null {
  if (!traceId || typeof traceId !== 'string') {
    return null;
  }
  const cleaned = traceId.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (cleaned.length !== traceId.length) {
    return {
      title: 'Invalid Trace ID',
      content: 'Trace ID must contain only hexadecimal characters (0-9, a-f)',
    };
  }
  if (cleaned.length !== 16 && cleaned.length !== 32) {
    return {
      title: 'Invalid Trace ID Length',
      content: `Trace ID must be 16 or 32 characters (currently ${cleaned.length})`,
    };
  }

  return null;
}
