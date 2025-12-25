import { createContext, useContext, useState, type ReactNode } from "react";

interface AutoplayConsentContextValue {
  autoplayEnabled: boolean;
  setAutoplayEnabled: (enabled: boolean) => void;
}

const AutoplayConsentContext = createContext<AutoplayConsentContextValue | undefined>(undefined);

export function AutoplayConsentProvider({ children }: { children: ReactNode }) {
  const [autoplayEnabled, setAutoplayEnabledState] = useState<boolean>(true);

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
