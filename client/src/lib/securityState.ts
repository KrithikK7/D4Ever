let csrfToken: string | null = null;

export function getClientCsrfToken() {
  return csrfToken;
}

export function setClientCsrfToken(token: string | null) {
  csrfToken = token ?? null;
}

export function clearClientAuthState() {
  csrfToken = null;
}

export async function ensureCsrfTokenFromServer() {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch("/api/auth/csrf", {
      credentials: "include",
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    setClientCsrfToken(data?.csrfToken ?? null);
    return csrfToken;
  } catch {
    return null;
  }
}
