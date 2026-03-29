import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import Colors from "@/constants/Colors";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/utils/storage";

type ResolvedScheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  colors: typeof Colors.dark;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  scheme: "dark",
  colors: Colors.dark,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getThemeMode().then((m) => {
      setModeState(m);
      setLoaded(true);
    });
  }, []);

  const handleSetMode = (m: ThemeMode) => {
    setModeState(m);
    setThemeMode(m);
  };

  const resolved = mode === "system" ? (systemScheme ?? "dark") : mode;
  const scheme: ResolvedScheme = resolved === "light" ? "light" : "dark";

  const colors = Colors[scheme];

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, scheme, colors, setMode: handleSetMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
