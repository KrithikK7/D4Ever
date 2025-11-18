export const USER_STORAGE_KEY = "kdrama-journal-user";
export const CSRF_STORAGE_KEY = "kdrama-journal-csrf";

export function clearStoredAuth() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(CSRF_STORAGE_KEY);
}
