import { createContext, useContext, useState, ReactNode, useRef } from "react";

interface PauseListener {
  pause: () => void;
  resume: () => void;
}

interface MusicPlayerContextType {
  currentSongUrl: string | null;
  currentSongName: string | null;
  forceReloadKey: number;
  setCurrentSong: (url: string | null, name: string | null, forceReload?: boolean) => void;
  registerPauseListener: (listener: PauseListener) => () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [currentSongName, setCurrentSongName] = useState<string | null>(null);
  const [forceReloadKey, setForceReloadKey] = useState(0);
  const listenersRef = useRef(new Set<PauseListener>());

  const setCurrentSong = (url: string | null, name: string | null, forceReload = false) => {
    setCurrentSongUrl(url);
    setCurrentSongName(name);
    if (forceReload) {
      setForceReloadKey(prev => prev + 1);
    }
  };

  const registerPauseListener = (listener: PauseListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  };

  const pauseMusic = () => {
    listenersRef.current.forEach((listener: PauseListener) => listener.pause());
  };

  const resumeMusic = () => {
    listenersRef.current.forEach((listener: PauseListener) => listener.resume());
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSongUrl,
        currentSongName,
        forceReloadKey,
        setCurrentSong,
        registerPauseListener,
        pauseMusic,
        resumeMusic,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}
