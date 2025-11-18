import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { USER_STORAGE_KEY, CSRF_STORAGE_KEY, clearStoredAuth } from "@/lib/authStorage";

export type UserRole = "admin" | "reader";

export type UserPrivileges = {
  canCreateSections: boolean;
  canEditSections: boolean;
  canEditOwnSections: boolean;
  canDeleteSections: boolean;
  canDeleteOwnSections: boolean;
};

const defaultPrivileges: UserPrivileges = {
  canCreateSections: false,
  canEditSections: false,
  canEditOwnSections: false,
  canDeleteSections: false,
  canDeleteOwnSections: false,
};

const normalizePrivileges = (privileges?: Partial<UserPrivileges> | null): UserPrivileges => ({
  ...defaultPrivileges,
  ...(privileges ?? {}),
});

interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  privileges: UserPrivileges;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: keyof UserPrivileges) => boolean;
  validateSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mapUserFromResponse = useCallback((rawUser: any | null): AuthUser | null => {
    if (!rawUser) {
      return null;
    }
    return {
      id: rawUser.id,
      username: rawUser.username,
      role: rawUser.role,
      privileges: normalizePrivileges(rawUser.privileges),
    };
  }, []);

  const logout = useCallback(() => {
    const storedToken = localStorage.getItem(CSRF_STORAGE_KEY);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setUser(null);
    setCsrfToken(null);
    clearStoredAuth();
    const headers: Record<string, string> = {};
    if (storedToken) {
      headers["X-CSRF-Token"] = storedToken;
    }
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers,
    }).catch(() => undefined);
  }, []);

  const validateSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/validate", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          const mappedUser = mapUserFromResponse(data.user);
          setUser(mappedUser);
          setCsrfToken(data.csrfToken || null);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
          if (data.csrfToken) {
            localStorage.setItem(CSRF_STORAGE_KEY, data.csrfToken);
          }
        } else {
          logout();
        }
      } else {
        const errorData = await response.json();
        if (errorData.invalidSession) {
          logout();
        }
      }
    } catch (e) {
      console.error("Session validation error:", e);
      logout();
    } finally {
      setIsValidating(false);
    }
  }, [logout, mapUserFromResponse]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [user, logout]);

  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    resetInactivityTimer();

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const authResponse = await response.json();
        const mappedUser = mapUserFromResponse(authResponse.user);
        setUser(mappedUser);
        setCsrfToken(authResponse.csrfToken || null);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
        if (authResponse.csrfToken) {
          localStorage.setItem(CSRF_STORAGE_KEY, authResponse.csrfToken);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const hasPermission = useCallback(
    (permission: keyof UserPrivileges) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return user.privileges[permission];
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isAuthenticated: Boolean(user),
        hasPermission,
        validateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
