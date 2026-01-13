import { getConfigValue } from './config/get-config';

export function getTimeFormat(withSeconds = true) {
  const timeformat = getConfigValue('timeFormat');
  if (timeformat === '24h') {
    return withSeconds ? 'HH:mm:ss' : 'HH:mm';
  }

  // default to 12h
  return withSeconds ? 'hh:mm:ss a' : 'hh:mm a';
}
