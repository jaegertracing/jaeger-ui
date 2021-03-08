// Various functions pulled from the internal react-table utils package - useful
// when pulling hooks from the main repo before changing them.

export function sum(arr: any[]): number {
  return arr.reduce((prev, curr) => prev + curr, 0)
}

export function getFirstDefined(...args: any[]): any {
  for (let i = 0; i < args.length; i += 1) {
    if (typeof args[i] !== 'undefined') {
      return args[i]
    }
  }
}
