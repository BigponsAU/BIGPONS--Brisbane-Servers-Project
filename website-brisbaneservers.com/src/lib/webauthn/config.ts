import { getRuntimeEnv } from '~/utils/runtime-env';

export function getWebAuthnRpId(): string {
  const configured = getRuntimeEnv('WEBAUTHN_RP_ID');
  if (configured) return configured.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const siteUrl = getRuntimeEnv('PUBLIC_SITE_URL', 'https://brisbaneservers.com') ?? 'https://brisbaneservers.com';
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'brisbaneservers.com';
  }
}

export function getWebAuthnOrigin(): string {
  const configured = getRuntimeEnv('WEBAUTHN_ORIGIN');
  if (configured) return configured.replace(/\/$/, '');

  const siteUrl = getRuntimeEnv('PUBLIC_SITE_URL', 'https://brisbaneservers.com') ?? 'https://brisbaneservers.com';
  try {
    const url = new URL(siteUrl);
    return url.origin;
  } catch {
    return 'https://brisbaneservers.com';
  }
}

export function isPasskeyEnabled(): boolean {
  const flag = getRuntimeEnv('PASSKEY_AUTH_ENABLED', '1');
  return flag !== '0' && flag !== 'false';
}
