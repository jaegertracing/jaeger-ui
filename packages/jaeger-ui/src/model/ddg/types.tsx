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

export type TDdgPayload = {
  operation: string;
  service: string;
}[][];

export type TDdgService = {
  name: string;
  operations: Map<string, TDdgOperation>;
};

export type TDdgOperation = {
  name: string;
  pathElems: PathElem[];
  service: TDdgService;
};

export type TDdgPath = {
  focalIdx: number;
  members: PathElem[];
};

export type TDdgServiceMap = Map<string, TDdgService>;

export type TDdgPathElemsByDistance = Map<number, PathElem[]>;

export type TDdgTransformedDdgData = {
  pathElemsByDistance: TDdgPathElemsByDistance;
  paths: TDdgPath[];
  services: TDdgServiceMap;
};

export class PathElem {
  memberOf: TDdgPath;
  operation: TDdgOperation;
  pathIdx: number;
  private _visibilityIdx?: number;

  constructor({ path, operation, pathIdx }: { path: TDdgPath; operation: TDdgOperation; pathIdx: number }) {
    this.memberOf = path;
    this.operation = operation;
    this.pathIdx = pathIdx;

    operation.pathElems.push(this);
  }

  get distance() {
    return this.pathIdx - this.memberOf.focalIdx;
  }

  set visibilityIdx(visibiliityIdx: number) {
    if (this._visibilityIdx == null) {
      this._visibilityIdx = visibiliityIdx;
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
