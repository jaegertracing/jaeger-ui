import { createBrowserHistory, createMemoryHistory, History } from 'history';

interface HistoryV4Methods {
  length: number;
  location: {
    pathname: string;
    search: string;
    hash: string;
    state: any;
  };
  action: string;
  push: (path: string, state?: any) => void;
  replace: (path: string, state?: any) => void;
  go: (n: number) => void;
  goBack: () => void;
  goForward: () => void;
  block: (prompt?: boolean | string | Function) => void;
  listen: (listener: Function) => () => void;
}

// Polyfill for history v5 to maintain compatibility with react-router-dom v5
export const createHistoryWithPolyfill = (isMemory = false): History & HistoryV4Methods => {
  const history = isMemory ? createMemoryHistory() : createBrowserHistory();

  // Add length property to match v4 API
  Object.defineProperty(history, 'length', {
    get() {
      return (history as any).index + 1;
    },
  });

  // Ensure v4 location shape
  const originalPush = history.push;
  const originalReplace = history.replace;

  // Override push method to handle both string and object arguments
  history.push = (path: any, state?: any) => {
    if (typeof path === 'string') {
      return originalPush(path, { state });
    }
    if (typeof path === 'object') {
      const { pathname, search, hash, state: pathState } = path;
      return originalPush(
        {
          pathname: pathname || '/',
          search: search || '',
          hash: hash || '',
        },
        { state: pathState || state }
      );
    }
    return originalPush(path);
  };

  // Override replace method to handle both string and object arguments
  history.replace = (path: any, state?: any) => {
    if (typeof path === 'string') {
      return originalReplace(path, { state });
    }
    if (typeof path === 'object') {
      const { pathname, search, hash, state: pathState } = path;
      return originalReplace(
        {
          pathname: pathname || '/',
          search: search || '',
          hash: hash || '',
        },
        { state: pathState || state }
      );
    }
    return originalReplace(path);
  };

  // Ensure location shape matches v4
  Object.defineProperty(history, 'location', {
    get() {
      const location = (history as any).location;
      return {
        ...location,
        state: location.state?.state,
      };
    },
  });

  return history as History & HistoryV4Methods;
};