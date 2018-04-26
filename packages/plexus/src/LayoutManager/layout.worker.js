import viz from 'viz.js';

import getLayout from './getLayout';

let currentMeta;

function onMessage(event) {
  // const { meta, source, options } = event.data;
  const { meta, edges, vertices } = event.data;
  console.log(event);
  currentMeta = meta;
  // debugger;
  // const result = viz(source, options);
  let message;
  const { layoutError, ...result } = getLayout(meta.phase, edges, vertices);
  if (layoutError) {
    message = { meta, type: 'layout-error', ...result }
  } else {
    message = { meta, type: `${meta.phase}-result`, ...result };
  }
  self.postMessage(message);
  currentMeta = null;
}

function onError(errorType, event) {
  const { colno, error, filename, lineno, message: eventMessage } = event.data;
  const { code, message, name, stack } = error || {};
  this.postMessage({
    type: 'error',
    meta: currentMeta,
    errorMessage: {
      colno,
      errorType,
      filename,
      lineno,
      message: eventMessage,
      error: error && { code, message, name, stack },
    }
  });
}

// /**
//  * @param {PromiseRejectionEvent} event
//  */
// function onUnhandledRejection(event) {
//   const errorMessage = { errorType: 'unhandledrejection' };
//   if (event.reason instanceof Error) {
//     const { code, message, name, stack } = event.reason;
//     errorMessage.error = { code, message, name, stack };
//     errorMessage.message = message;
//   } else if (typeof event.reason === 'string') {
//     errorMessage.message = event.reason;
//   } else {
//     errorMessage.message = String(event.reason);
//   }
//   this.postMessage({
//     errorMessage,
//     type: 'error',
//     meta: currentMeta,
//   });
// }

self.onmessage = onMessage;
self.onerror = onError.bind(null, 'error');
self.onmessageerror = onError.bind(null, 'messageerror');
// self.onunhandledrejection = onUnhandledRejection;


// import Coordinator from './Coordinator';

// function dispose(coordinator) {
//   self.removeEventListener('message', coordinator.onLayoutMessage);
//   self.removeEventListener('messageerror', coordinator.onLocalError);
//   self.removeEventListener('error', coordinator.onLocalError);
// }

// const coordinator = new Coordinator(self.postMessage, () => dispose(coordinator));

// self.addEventListener('message', coordinator.onLayoutMessage);
// self.addEventListener('messageerror', coordinator.onLocalError);
// self.addEventListener('error', coordinator.onLocalError);
