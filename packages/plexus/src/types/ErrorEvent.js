export type ErrorEvent = {
  message: string,
  filename: string,
  lineno: number,
  colno?: number,
  error?: any,
};
