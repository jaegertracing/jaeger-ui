// declare module "worker*";
// declare module "worker/LeDiv/viz-wrapper.worker";

// declare module "worker/LeDiv/viz-wrapper.worker" {
//   class WebpackWorker extends Worker {
//     constructor();
//   }
//   export default WebpackWorker;
// }

// declare module "worker-loader?inline&fallback=false!./viz-wrapper.worker" {
//   class WebpackWorker extends Worker {
//     constructor();
//   }
//   export default WebpackWorker;
// }

// declare module "*.worker" {
//   class WebpackWorker extends Worker {
//     constructor();
//   }
//   export default WebpackWorker;
// }

declare module "worker/*" {
  class WebpackWorker extends Worker {
    id: number;
    constructor();
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
  }
  export default WebpackWorker;
}

// declare module "worker-loader*" {
//   class WebpackWorker extends Worker {
//     constructor();
//   }
//   export default WebpackWorker;
// }

declare module "viz.js" {
  export default function viz(dot: string, options?: {}): string;
}
