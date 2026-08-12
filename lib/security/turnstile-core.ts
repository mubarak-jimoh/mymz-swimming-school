export function turnstileConfiguration(nodeEnv: string | undefined, siteKey?: string, secret?: string) {
  const configured = Boolean(siteKey?.trim() && secret?.trim());
  return { configured, allowMissing: !configured && nodeEnv !== "production" };
}

export function validTurnstileToken(token: string) {
  return token.length > 0 && token.length <= 2_048;
}
