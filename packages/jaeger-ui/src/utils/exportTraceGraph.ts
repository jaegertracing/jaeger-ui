// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

class ExportTraceGraphUtil {
  private static instance: ExportTraceGraphUtil;
  private html2canvasLoaded = false;
  private html2canvasLoading = false;
  private loadPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): ExportTraceGraphUtil {
    if (!ExportTraceGraphUtil.instance) {
      ExportTraceGraphUtil.instance = new ExportTraceGraphUtil();
    }
    return ExportTraceGraphUtil.instance;
  }

  private async ensureHtml2CanvasLoaded(): Promise<boolean> {
    if (typeof (window as any).html2canvas !== 'undefined') {
      this.html2canvasLoaded = true;
      return true;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.html2canvasLoading = true;
    this.loadPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

      script.onload = () => {
        this.html2canvasLoaded = true;
        this.html2canvasLoading = false;
        this.loadPromise = null;
        resolve(true);
      };

      script.onerror = () => {
        console.error('[Export] ✗ Failed to load html2canvas');
        this.html2canvasLoading = false;
        this.loadPromise = null;
        resolve(false);
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async exportToSVG(): Promise<void> {
    const dagContainer = document.querySelector('.TraceGraph--dag');
    if (!dagContainer) {
      throw new Error('Could not find graph container');
    }

    const graphContainer = dagContainer.querySelector('div[style*="overflow: hidden"]') as HTMLElement;
    if (!graphContainer) {
      throw new Error('Could not find graph viewport');
    }

    const loaded = await this.ensureHtml2CanvasLoaded();
    if (!loaded) {
      throw new Error('Failed to load required library. Please check your internet connection.');
    }

    const html2canvas = (window as any).html2canvas;

    const canvas = await html2canvas(graphContainer, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const imageData = canvas.toDataURL('image/png');

    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <title>Jaeger Trace Graph</title>
  <desc>Exported trace graph from Jaeger UI</desc>
  <image width="${canvas.width}" height="${canvas.height}" xlink:href="${imageData}"/>
</svg>`;

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.href = url;
    link.download = `trace-graph-${timestamp}.svg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const exportTraceGraph = ExportTraceGraphUtil.getInstance();
