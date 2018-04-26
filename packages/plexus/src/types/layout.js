export type LayoutOptions = {
  useDotEdges?: boolean,
  maxWorkers?: number,
  workerEdgeThreshold?: number,
  // TODO(joe): finish options implementation
  // memory?: number | {
  //   total?: numnber,
  //   oomRetyGrowth?: number,
  //   oomRetries?: number,
  // },
  // gvAttributes?: {
  //   graph?: {
  //     config: { [string]: string },
  //     replace?: boolean,
  //   },
  //   node?: {
  //     config: { [string]: string },
  //     replace?: boolean,
  //   },
  //   edge?: {
  //     config: { [string]: string },
  //     replace?: boolean,
  //   },
  // },
};

// export type InputVertex = {
//   key: string | number,
//   height: number,
//   width: number,
// };

// export type InputEdge = {
//   from: string | number,
//   to: string | number,
//   isBidirectional?: boolean,
// };

type VertexKey = string | number;

type Vertex = {
  key: VertexKey,
  top?: number,
  left?: number,
  width: number,
  height: number,
};

type Edge = {
  from: VertexKey,
  to: VertexKey,
  isBidirectional?: boolean,
  pathPoints?: [number, number][],
};

export type Positions = {
  isCancelled: boolean,
  vertices?: Vertex[],
};

export type Layout = {
  isCancelled: boolean,
  edges?: Edge[],
  vertices?: Vertex[],
};

export type PendingLayoutResult = {
  positions: Promise<Positions>,
  layout: Promise<Layout>,
};
