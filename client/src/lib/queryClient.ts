import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { CSRF_STORAGE_KEY, USER_STORAGE_KEY, clearStoredAuth } from "./authStorage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      
      // Check if this is an invalid session error
      if (errorData.invalidSession) {
        clearStoredAuth();
        // Redirect to login page
        window.location.href = "/";
      }
      
      throw new Error(errorData.error || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // If response is not JSON, fall back to text
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const csrfToken = localStorage.getItem(CSRF_STORAGE_KEY);
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  if (csrfToken && !safeMethod) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Check for invalid session before throwing
  if (res.status === 401) {
    try {
      const errorData = await res.json();
      if (errorData.invalidSession) {
        clearStoredAuth();
        window.location.href = "/";
        return res;
      }
    } catch (e) {
      // Continue with normal error handling
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
