// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export type MediaType = 'image' | 'audio';

// Matched against the whole value, so a query string or fragment is allowed after the
// extension but nothing else is.
const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(?:[?#].*)?$/i;
const AUDIO_EXTENSION = /\.(mp3|wav|ogg|oga|flac|m4a|aac|opus|weba)(?:[?#].*)?$/i;

// data:<type>/<subtype>[;param][;base64],<data> - the comma is required, so a truncated
// `data:image/png;base64` with no payload is rejected rather than previewed as a broken
// image until its error event fires.
const DATA_URI = /^data:(image|audio)\/[^;,\s]+(?:;[^;,]*)*,/i;

const HTTP_URL = /^https?:\/\//i;

/**
 * Classifies an attribute value that is itself a link to media.
 *
 * Deliberately conservative on two axes, because a false positive here replaces text
 * a user asked to read with a broken preview:
 *
 * - Only `http(s)` URLs and `data:` URIs qualify. A bare `photo.png` is not a URL, and
 *   rendering it would resolve against the Jaeger origin rather than anything the trace
 *   refers to.
 * - The whole value must be the URL. Prose that merely mentions an image is still prose.
 *   (Whitespace is tolerated inside a `data:` URI, where an unencoded SVG payload
 *   legitimately contains spaces.)
 *
 * Detection is on the value alone. No attribute key is privileged, so this works for any
 * attribute carrying a link, whether or not it is part of the GenAI conventions.
 */
/**
 * Whether a media value carries its own payload rather than pointing at a host.
 *
 * An embedded payload costs no request, so rendering it tells no third party that someone
 * is reading this trace - the distinction the GenAI tab uses to decide what it may show
 * without being asked.
 */
export function isEmbeddedMedia(value: string): boolean {
  return /^data:/i.test(value.trim());
}

export function detectMediaType(value: unknown): MediaType | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dataMatch = DATA_URI.exec(trimmed);
  if (dataMatch) return dataMatch[1].toLowerCase() as MediaType;

  if (/\s/.test(trimmed) || !HTTP_URL.test(trimmed)) return null;
  if (IMAGE_EXTENSION.test(trimmed)) return 'image';
  if (AUDIO_EXTENSION.test(trimmed)) return 'audio';
  return null;
}
