// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export type TOneOfTwo<A, B> =
  | ({ [P in Exclude<keyof B, keyof A>]?: undefined } & A)
  | ({ [P in Exclude<keyof A, keyof B>]?: undefined } & B);

export type TOneOfFour<A, B, C, D> =
  | ({ [P in Exclude<keyof (B & C & D), keyof A>]?: undefined } & A)
  | ({ [P in Exclude<keyof (A & C & D), keyof B>]?: undefined } & B)
  | ({ [P in Exclude<keyof (A & B & D), keyof C>]?: undefined } & C)
  | ({ [P in Exclude<keyof (A & B & C), keyof D>]?: undefined } & D);
