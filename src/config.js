import {API_URL, DETECT_FACE_URL, HOST, KEYCLOAK_TOKEN_URL} from '@env';

export const KEYCLOAK_CLIENT_ID = 'graduation_thesis_ver2';

const trimTrailingSlash = value => (value || '').replace(new RegExp('/+$'), '');

const baseHost = trimTrailingSlash(HOST || 'http://localhost');
const isLocalHost =
  baseHost.includes('://localhost') ||
  baseHost.includes('://127.0.0.1') ||
  baseHost.includes('://10.0.2.2');

export const API_BASE_URL = trimTrailingSlash(API_URL || `${baseHost}/api`);

export const KEYCLOAK_TOKEN_ENDPOINT =
  KEYCLOAK_TOKEN_URL ||
  `${
    isLocalHost ? `${baseHost}:9000` : baseHost
  }/realms/hung2004/protocol/openid-connect/token`;

export const DETECT_FACE_ATTENDANCE_ENDPOINT = `${trimTrailingSlash(
  DETECT_FACE_URL ||
    (isLocalHost ? `${baseHost}:8888` : `${baseHost}/detect-face`),
)}/attendance`;

const decodeBase64 = input => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const str = input.replace(new RegExp('=+$'), '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  if (str.length % 4 === 1) {
    throw new Error('Invalid base64 payload');
  }

  for (const char of str) {
    const value = chars.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid base64 payload');
    }

    buffer = buffer * 64 + value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode(Math.floor(buffer / 2 ** bits) % 256);
      buffer %= 2 ** bits;
    }
  }

  return output;
};

export const decodeJwtPayload = token => {
  const payload = token?.split('.')?.[1];
  if (!payload) {
    return {};
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = decodeBase64(normalized);
  const encoded = binary
    .split('')
    .map(char => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
    .join('');

  return JSON.parse(decodeURIComponent(encoded));
};
