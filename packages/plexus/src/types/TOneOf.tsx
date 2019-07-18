// Copyright (c) 2018 Uber Technologies, Inc.
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

export type TOneOf<A, B, C = {}, D = {}, E = {}> =
  | { [P in Exclude<keyof (B & C & D & E), keyof A>]?: null } & A
  | { [P in Exclude<keyof (A & C & D & E), keyof B>]?: null } & B
  | { [P in Exclude<keyof (A & B & D & E), keyof C>]?: null } & C
  | { [P in Exclude<keyof (A & B & C & E), keyof D>]?: null } & D
  | { [P in Exclude<keyof (A & B & C & D), keyof E>]?: null } & E;

// eslint-disable-next-line no-undef
export default TOneOf;

export type TOneOfTwo<A, B> =
  | { [P in Exclude<keyof B, keyof A>]?: null } & A
  | { [P in Exclude<keyof A, keyof B>]?: null } & B;

export type TOneOfThree<A, B, C> =
  | { [P in Exclude<keyof (B & C), keyof A>]?: null } & A
  | { [P in Exclude<keyof (A & C), keyof B>]?: null } & B
  | { [P in Exclude<keyof (A & B), keyof C>]?: null } & C;

export type TOneOfFour<A, B, C, D> =
  | { [P in Exclude<keyof (B & C & D), keyof A>]?: null } & A
  | { [P in Exclude<keyof (A & C & D), keyof B>]?: null } & B
  | { [P in Exclude<keyof (A & B & D), keyof C>]?: null } & C
  | { [P in Exclude<keyof (A & B & C), keyof D>]?: null } & D;

export type TOneOfFive<A, B, C, D, E> = TOneOf<A, B, C, D, E>;
