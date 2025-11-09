import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AutoplayConsentContextValue {
  autoplayEnabled: boolean;
  setAutoplayEnabled: (enabled: boolean) => void;
}

const AutoplayConsentContext = createContext<AutoplayConsentContextValue | undefined>(undefined);

export function AutoplayConsentProvider({ children }: { children: ReactNode }) {
  const [autoplayEnabled, setAutoplayEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("autoplayEnabled") === "true";
  });

  useEffect(() => {
    if (autoplayEnabled) {
      window.localStorage.setItem("autoplayEnabled", "true");
    } else {
      window.localStorage.removeItem("autoplayEnabled");
    }
  }, [autoplayEnabled]);

  const setAutoplayEnabled = (enabled: boolean) => {
    setAutoplayEnabledState(enabled);
  };

  return (
    <AutoplayConsentContext.Provider value={{ autoplayEnabled, setAutoplayEnabled }}>
      {children}
    </AutoplayConsentContext.Provider>
  );
}

export function useAutoplayConsent() {
  const context = useContext(AutoplayConsentContext);
  if (!context) {
    throw new Error("useAutoplayConsent must be used within an AutoplayConsentProvider");
  }
  return context;
}
