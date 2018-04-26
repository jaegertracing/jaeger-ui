
import type { Edge, ErrorMessage, Vertex } from '../types/layout';
// export type ErrorMessage = {
//   colno: number,
//   errorType: string,
//   filename: string,
//   lineno: number,
//   message: string,
//   type: 'error',
//   error: ?{ code: ?any, message: string, name: string, stack: string },
// };



export type VizWorkMeta = {
  layoutId: number,
  workerId: number,
  phase: 'positions' | 'edges',
};

export type WorkerMessage = {
  type: 'positions-result' | 'edges-result' | 'layout-error' | 'error',
  meta: VizWorkMeta,
  edges?: Edge[],
  errorMessage?: ErrorMessage,
  layoutErrorMessage?: string,
  vertices?: Vertex[],
  graph?: { height: number, scale: number, width: number },
};