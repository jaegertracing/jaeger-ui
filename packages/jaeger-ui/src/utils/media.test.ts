// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { detectMediaType, isEmbeddedMedia } from './media';

describe('detectMediaType', () => {
  it('detects an https image URL', () => {
    expect(detectMediaType('https://example.com/cat.png')).toBe('image');
  });

  it('detects an http image URL', () => {
    expect(detectMediaType('http://example.com/cat.jpeg')).toBe('image');
  });

  it('detects an image URL with a query string', () => {
    expect(detectMediaType('https://example.com/cat.webp?w=200&h=100')).toBe('image');
  });

  it('detects an image URL with a fragment', () => {
    expect(detectMediaType('https://example.com/cat.gif#frame1')).toBe('image');
  });

  it('detects an https audio URL', () => {
    expect(detectMediaType('https://example.com/reply.mp3')).toBe('audio');
  });

  it('detects an audio URL with a query string', () => {
    expect(detectMediaType('https://example.com/reply.wav?t=12')).toBe('audio');
  });

  it('detects a base64 image data URI', () => {
    expect(detectMediaType('data:image/png;base64,iVBORw0KGgo=')).toBe('image');
  });

  it('detects a base64 audio data URI', () => {
    expect(detectMediaType('data:audio/mpeg;base64,SUQzBAAAAA==')).toBe('audio');
  });

  it('detects an unencoded SVG data URI containing whitespace', () => {
    expect(detectMediaType('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" />')).toBe('image');
  });

  it('ignores a data URI for a non-media type', () => {
    expect(detectMediaType('data:text/plain;base64,aGVsbG8=')).toBeNull();
  });

  it('ignores a data URI whose payload delimiter is missing', () => {
    expect(detectMediaType('data:image/png;base64')).toBeNull();
  });

  it('ignores a data URI with a media type but no delimiter or payload', () => {
    expect(detectMediaType('data:image/png')).toBeNull();
  });

  it('ignores a data URI with no subtype at all', () => {
    expect(detectMediaType('data:image')).toBeNull();
  });

  it('accepts a data URI with parameters before the payload', () => {
    expect(detectMediaType('data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+')).toBe('image');
  });

  it('accepts a data URI with an empty payload', () => {
    expect(detectMediaType('data:image/png;base64,')).toBe('image');
  });

  it('ignores a relative path that merely ends in an image extension', () => {
    expect(detectMediaType('photo.png')).toBeNull();
  });

  it('ignores an absolute filesystem path', () => {
    expect(detectMediaType('/var/tmp/photo.png')).toBeNull();
  });

  it('ignores a non-http scheme', () => {
    expect(detectMediaType('ftp://example.com/cat.png')).toBeNull();
  });

  it('ignores prose that merely mentions an image URL', () => {
    expect(detectMediaType('Here is the chart: https://example.com/cat.png')).toBeNull();
  });

  it('ignores an http URL with no media extension', () => {
    expect(detectMediaType('https://example.com/report')).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    expect(detectMediaType('  https://example.com/cat.png\n')).toBe('image');
  });

  it('is case insensitive on the extension', () => {
    expect(detectMediaType('https://example.com/CAT.PNG')).toBe('image');
  });

  it('returns null for a non-string value', () => {
    expect(detectMediaType(42)).toBeNull();
    expect(detectMediaType(null)).toBeNull();
    expect(detectMediaType(undefined)).toBeNull();
    expect(detectMediaType({ url: 'https://example.com/cat.png' })).toBeNull();
  });

  it('returns null for an empty or whitespace-only string', () => {
    expect(detectMediaType('')).toBeNull();
    expect(detectMediaType('   ')).toBeNull();
  });
});

describe('isEmbeddedMedia', () => {
  it('recognises a data URI, which carries its payload and needs no request', () => {
    expect(isEmbeddedMedia('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isEmbeddedMedia('  data:audio/mp3;base64,AAAA  ')).toBe(true);
    expect(isEmbeddedMedia('DATA:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });

  it('treats anything that points at a host as remote', () => {
    expect(isEmbeddedMedia('https://example.com/chart.png')).toBe(false);
    expect(isEmbeddedMedia('gs://bucket/photo.png')).toBe(false);
    expect(isEmbeddedMedia('')).toBe(false);
  });
});
