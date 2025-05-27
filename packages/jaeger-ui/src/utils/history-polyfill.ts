// Copyright (c) 2024 The Jaeger Authors.
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

/**
 * This polyfill bridges the API differences between history v4 and v5
 * to maintain compatibility with react-router-dom v5 while using history v5.
 * 
 * This should be removed when upgrading to react-router-dom v6+ which uses
 * the useNavigate hook instead of direct history manipulation.
 */
import { History } from 'history';

export function createHistoryPolyfill(history: History): History {
  // Add length property to history object
  Object.defineProperty(history, 'length', {
    get: function() {
      return this.index + 1;
    },
    configurable: true,
  });

  return history;
}