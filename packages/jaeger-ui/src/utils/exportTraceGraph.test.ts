// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { exportTraceGraph } from './exportTraceGraph';

describe('exportTraceGraph', () => {
  let mockCanvas: any;
  let mockHtml2Canvas: jest.Mock;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    (exportTraceGraph as any).html2canvasLoaded = false;
    (exportTraceGraph as any).html2canvasLoading = false;
    (exportTraceGraph as any).loadPromise = null;

    mockCanvas = {
      width: 1000,
      height: 500,
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
    };

    mockHtml2Canvas = jest.fn().mockResolvedValue(mockCanvas);

    const mockGraphContainer = document.createElement('div');
    mockGraphContainer.setAttribute('style', 'overflow: hidden; width: 100%; height: 100%;');
    const mockDagContainer = document.createElement('div');
    mockDagContainer.className = 'TraceGraph--dag';
    mockDagContainer.appendChild(mockGraphContainer);
    document.body.appendChild(mockDagContainer);

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a');
        link.click = jest.fn();
        return link;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).html2canvas;
    if (originalCreateObjectURL) {
      URL.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      URL.revokeObjectURL = originalRevokeObjectURL;
    }

    jest.restoreAllMocks();
  });

  describe('exportToSVG()', () => {
    it('throws error when container is not found', async () => {
      (window as any).html2canvas = mockHtml2Canvas;
      document.body.innerHTML = '';

      await expect(exportTraceGraph.exportToSVG()).rejects.toThrow('Could not find graph container');
    });

    it('throws error when graph viewport is not found', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      document.body.innerHTML = '';
      const mockDagContainer = document.createElement('div');
      mockDagContainer.className = 'TraceGraph--dag';
      document.body.appendChild(mockDagContainer);

      await expect(exportTraceGraph.exportToSVG()).rejects.toThrow('Could not find graph viewport');
    });

    it('exports SVG successfully when html2canvas is available', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      await exportTraceGraph.exportToSVG();

      expect(mockHtml2Canvas).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
        })
      );

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('creates SVG with correct structure', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      let capturedBlob: Blob | null = null;
      (URL.createObjectURL as jest.Mock).mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-url';
      });

      await exportTraceGraph.exportToSVG();

      expect(capturedBlob).not.toBeNull();
      expect(capturedBlob!.type).toBe('image/svg+xml;charset=utf-8');

      const text = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(capturedBlob!);
      });

      expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(text).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(text).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
      expect(text).toContain('width="1000"');
      expect(text).toContain('height="500"');
      expect(text).toContain('<title>Jaeger Trace Graph</title>');
      expect(text).toContain('<image');
      expect(text).toContain('xlink:href="data:image/png;base64,mockImageData"');
    });

    it('generates filename with timestamp', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      const dateSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:45.123Z');

      let capturedFilename = '';

      const originalAppendChild = document.body.appendChild.bind(document.body);
      jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
        if (node.tagName === 'A') {
          capturedFilename = node.download;
        }
        return originalAppendChild(node);
      });

      await exportTraceGraph.exportToSVG();

      expect(capturedFilename).toMatch(/^trace-graph-2024-01-15T10-30-45\.svg$/);

      dateSpy.mockRestore();
    });

    it('handles html2canvas capture errors', async () => {
      (window as any).html2canvas = jest.fn().mockRejectedValue(new Error('Capture failed'));

      await expect(exportTraceGraph.exportToSVG()).rejects.toThrow('Capture failed');
    });

    it('reuses already loaded library', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      await exportTraceGraph.exportToSVG();
      await exportTraceGraph.exportToSVG();

      expect(mockHtml2Canvas).toHaveBeenCalledTimes(2);
    });

    it('properly cleans up DOM elements after export', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      const initialChildCount = document.body.children.length;

      await exportTraceGraph.exportToSVG();

      expect(document.body.children.length).toBe(initialChildCount);
    });
  });

  describe('Library loading', () => {
    it('loads html2canvas library when not available', async () => {
      delete (window as any).html2canvas;

      const scriptElements: HTMLScriptElement[] = [];
      const originalHeadAppendChild = document.head.appendChild.bind(document.head);
      jest.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
        if (node.tagName === 'SCRIPT') {
          scriptElements.push(node);
          setTimeout(() => {
            (window as any).html2canvas = mockHtml2Canvas;
            if (node.onload) {
              node.onload(new Event('load'));
            }
          }, 0);
          return originalHeadAppendChild(node);
        }
        return originalHeadAppendChild(node);
      });

      await exportTraceGraph.exportToSVG();

      expect(scriptElements.length).toBeGreaterThan(0);
      expect(scriptElements[0].src).toContain('html2canvas');
      expect(mockHtml2Canvas).toHaveBeenCalled();
    });

    it('handles script loading failure', async () => {
      delete (window as any).html2canvas;

      const originalHeadAppendChild = document.head.appendChild.bind(document.head);
      jest.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
        if (node.tagName === 'SCRIPT') {
          setTimeout(() => {
            if (node.onerror) {
              node.onerror(new ErrorEvent('error'));
            }
          }, 0);
          return originalHeadAppendChild(node);
        }
        return originalHeadAppendChild(node);
      });

      await expect(exportTraceGraph.exportToSVG()).rejects.toThrow('Failed to load required library');
    });

    it('does not load library twice for concurrent requests', async () => {
      delete (window as any).html2canvas;

      let scriptLoadCount = 0;
      const originalHeadAppendChild = document.head.appendChild.bind(document.head);
      jest.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
        if (node.tagName === 'SCRIPT') {
          scriptLoadCount++;
          setTimeout(() => {
            (window as any).html2canvas = mockHtml2Canvas;
            if (node.onload) {
              node.onload(new Event('load'));
            }
          }, 10);
          return originalHeadAppendChild(node);
        }
        return originalHeadAppendChild(node);
      });

      await Promise.all([exportTraceGraph.exportToSVG(), exportTraceGraph.exportToSVG()]);

      expect(scriptLoadCount).toBe(1);
      expect(mockHtml2Canvas).toHaveBeenCalledTimes(2);
    });

    it('returns true when library is already loaded', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      const result = await (exportTraceGraph as any).ensureHtml2CanvasLoaded();

      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles very large canvas dimensions', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      mockCanvas.width = 10000;
      mockCanvas.height = 8000;

      await exportTraceGraph.exportToSVG();

      expect(mockHtml2Canvas).toHaveBeenCalled();
    });

    it('handles canvas with zero dimensions gracefully', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      mockCanvas.width = 0;
      mockCanvas.height = 0;

      await exportTraceGraph.exportToSVG();

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles empty base64 data', async () => {
      (window as any).html2canvas = mockHtml2Canvas;

      mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,');

      await exportTraceGraph.exportToSVG();

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
