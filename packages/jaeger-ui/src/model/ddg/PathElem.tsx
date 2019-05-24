// Copyright (c) 2019 Uber Technologies, Inc.
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

import { TDdgOperation, TDdgPath } from './types';

export default class PathElem {
  memberIdx: number;
  memberOf: TDdgPath;
  operation: TDdgOperation;
  private _visibilityIdx?: number;

  constructor({
    path,
    operation,
    memberIdx,
  }: {
    path: TDdgPath;
    operation: TDdgOperation;
    memberIdx: number;
  }) {
    this.memberIdx = memberIdx;
    this.memberOf = path;
    this.operation = operation;
  }

  get distance() {
    return this.memberIdx - this.memberOf.focalIdx;
  }

  set visibilityIdx(visibilityIdx: number) {
    if (this._visibilityIdx == null) {
      this._visibilityIdx = visibilityIdx;
    } else {
      throw new Error('Visibility Index cannot be changed once set');
    }
  }

  get visibilityIdx(): number {
    if (this._visibilityIdx == null) {
      throw new Error('Visibility Index was never set for this PathElem');
    }
    return this._visibilityIdx;
  }
}
