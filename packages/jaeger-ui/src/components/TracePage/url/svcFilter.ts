// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Compute a 16-bit checksum of the sorted service name list.
 * Used to detect when the service list has changed since a URL was generated.
 */
export function svcChecksum(sortedNames: ReadonlyArray<string>): string {
  const input = sortedNames.join('\0');
  let h = 0x811c;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x0101) & 0xffff;
  }
  return h.toString(16);
}

/**
 * Encode a service visibility selection as a "<checksum>.<bitmask>" hex string.
 * Returns null if all services are visible (no filter needed).
 */
export function encodeSvcFilter(
  sortedServiceNames: ReadonlyArray<string>,
  visibleServices: ReadonlySet<string>
): string | null {
  if (sortedServiceNames.length === 0) return null;
  // All visible → no filter
  if (visibleServices.size >= sortedServiceNames.length) {
    let allVisible = true;
    for (const name of sortedServiceNames) {
      if (!visibleServices.has(name)) {
        allVisible = false;
        break;
      }
    }
    if (allVisible) return null;
  }

  let mask = BigInt(0);
  for (let i = 0; i < sortedServiceNames.length; i++) {
    if (visibleServices.has(sortedServiceNames[i])) {
      mask |= BigInt(1) << BigInt(i);
    }
  }

  // Empty mask means no services visible — invalid state, return null.
  if (mask === BigInt(0)) return null;

  const checksum = svcChecksum(sortedServiceNames);
  return `${checksum}.${mask.toString(16)}`;
}

/**
 * Decode a "<checksum>.<bitmask>" string into a Set of visible service names.
 * Returns null if the format is invalid or the bitmask decodes to all-visible.
 * Returns { visibleServices, stale: true } when the checksum doesn't match.
 */
export function decodeSvcFilter(
  sortedServiceNames: ReadonlyArray<string>,
  encoded: string
): { visibleServices: Set<string>; stale: boolean } | null {
  if (!encoded || sortedServiceNames.length === 0) return null;

  const dotIndex = encoded.indexOf('.');
  if (dotIndex < 1) return null;

  const checksumHex = encoded.slice(0, dotIndex);
  const bitmaskHex = encoded.slice(dotIndex + 1);
  if (!bitmaskHex) return null;

  const currentChecksum = svcChecksum(sortedServiceNames);
  if (checksumHex.toLowerCase() !== currentChecksum.toLowerCase()) {
    return { visibleServices: new Set(sortedServiceNames), stale: true };
  }

  let mask: bigint;
  try {
    mask = BigInt(`0x${bitmaskHex}`);
  } catch {
    return null;
  }

  if (mask === BigInt(0)) return null;

  const visibleServices = new Set<string>();
  for (let i = 0; i < sortedServiceNames.length; i++) {
    if (mask & (BigInt(1) << BigInt(i))) {
      visibleServices.add(sortedServiceNames[i]);
    }
  }

  // No in-range bits set → invalid filter (would prune everything)
  if (visibleServices.size === 0) return null;

  // All visible → no filter
  if (visibleServices.size === sortedServiceNames.length) return null;

  return { visibleServices, stale: false };
}

/**
 * Derive the sorted service names array from a trace's services list.
 */
export function getSortedServiceNames(
  services: ReadonlyArray<{ name: string; numberOfSpans: number }>
): string[] {
  return services.map(s => s.name).sort();
}
