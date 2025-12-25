let cachedNonce: string | null | undefined;

export function getCspNonce() {
  if (cachedNonce !== undefined) {
    return cachedNonce;
  }

  const meta = document.querySelector('meta[name="csp-nonce"]');
  cachedNonce = meta?.getAttribute("content") ?? null;
  return cachedNonce;
}
