// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Type declarations for third-party modules without TypeScript definitions

declare module 'logfmt/lib/logfmt_parser' {
  export function parse(input: string): Record<string, any>;
}

declare module 'logfmt/lib/stringify' {
  export function stringify(data: Record<string, any>): string;
}

declare module 'store' {
  const store: {
    get(key: string): any;
    set(key: string, value: any): void;
  };
  export default store;
}
