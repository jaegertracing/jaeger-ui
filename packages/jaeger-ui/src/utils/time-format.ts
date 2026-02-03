import { getConfigValue } from './config/get-config';

export function getTimeFormatWithSeconds() {
  const timeFormat = getConfigValue('timeFormat');
  if (timeFormat.toLowerCase() === '24h') {
    return 'HH:mm:ss';
  }
  return 'hh:mm:ss a';
}

export function getTimeFormatWithoutSeconds() {
  const timeFormat = getConfigValue('timeFormat');
  if (timeFormat.toLowerCase() === '24h') {
    return 'HH:mm';
  }
  return 'hh:mm a';
}
