// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * Given a transformer function, returns a function that invokes the
 * transformer on the argument and caches the transformation before returning
 * it. If the source value changes, the transformation is recalculated, cached
 * and returned.
 *
 * @param  {function} xformer The transformer function, the most recent result
 *                            of which is cached.
 * @return {function} A wrapper around the transformer function which which
 *                    caches the last transformation, returning the cached
 *                    value if the source value is the same.
 */
export default function getLastXformCacher(xformer) {
  let lastArgs = null;
  let lastXformed = null;

  return function getOrCache(...args) {
    const sameArgs = lastArgs &&
      lastArgs.length === args.length &&
      lastArgs.every((lastArg, i) => lastArg === args[i]);
    if (sameArgs) {
      return lastXformed;
    }
    lastArgs = args;
    lastXformed = xformer(...args);
    return lastXformed;
  };
}
