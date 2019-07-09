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

// Util type to avoid the error of a field in a type union not being present in all sub-types. This
// allows for discriminate unions between types that don't have a common singleton property by
// installing the missing properties. E.g. https://bit.ly/2YRZbwF
//
//    type SN = OneOf<{ s: string, isString: true }, { n: number, isNum: true }>;
//    type SNOops = { s: string, isString: true } | { n: number, isNum: true };
//    const ok = (sn: SN) => console.log(sn.isNum, sn.isString ? typeof sn.s === 'string' : sn.n);
//    const oops = (sn: SNOops) => console.log(sn.isNum, sn.isString ? typeof sn.s === 'string' : sn.n);
//                                         errors ^^^^^     ^^^^^^^^             ^                   ^
export type TOneOf<T, U> =
  | { [P in Exclude<keyof U, keyof T>]?: null } & T
  | { [P in Exclude<keyof T, keyof U>]?: null } & U;

// eslint-disable-next-line no-undef
export default TOneOf;
