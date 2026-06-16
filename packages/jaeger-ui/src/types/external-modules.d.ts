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

declare module 'd3-flame-graph' {
  interface FlameGraphNode {
    name: string;
    value: number;
    children?: FlameGraphNode[];
  }

  interface FlameGraph {
    (selection: any): void;
    width(value: number): FlameGraph;
    cellHeight(value: number): FlameGraph;
    inverted(value: boolean): FlameGraph;
    sort(value: boolean): FlameGraph;
    transitionDuration(value: number): FlameGraph;
    minFrameSize(value: number): FlameGraph;
    selfValue(value: boolean): FlameGraph;
    setColorMapper(mapper: (d: any, originalColor: string) => string): FlameGraph;
    setColorHue(hue: string): FlameGraph;
    onClick(callback: (d: any) => void): FlameGraph;
    onHover(callback: (d: any) => void): FlameGraph;
    tooltip(tip: any): FlameGraph;
    update(data: FlameGraphNode): void;
    resetZoom(): void;
    destroy(): void;
  }

  export default function flamegraph(): FlameGraph;
}

declare module 'd3-flame-graph/dist/d3-flamegraph.css' {}
