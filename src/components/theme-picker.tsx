import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = [
  { id: "graphite", label: "Original", swatch: "bg-theme-graphite" },
  { id: "blue", label: "Blue", swatch: "bg-theme-blue" },
  { id: "black", label: "Black", swatch: "bg-theme-black" },
  { id: "yellow", label: "Yellow", swatch: "bg-theme-yellow" },
  { id: "purple", label: "Purple", swatch: "bg-theme-purple" },
  { id: "green", label: "Green", swatch: "bg-theme-green" },
  { id: "cyan", label: "Cyan", swatch: "bg-theme-cyan" },
  { id: "orange", label: "Orange", swatch: "bg-theme-orange" },
] as const;
type Theme = typeof themes[number]["id"];
const ThemeContext = createContext<{ theme: Theme; select: (theme: Theme) => void }>({ theme: "graphite", select: () => {} });

function applyTheme(next: Theme) {
  document.documentElement.dataset["theme"] = next;
  document.body.classList.remove("theme-flash");
  // Restart the short theme illumination on every selection.
  void document.body.offsetWidth;
  document.body.classList.add("theme-flash");
  window.setTimeout(() => document.body.classList.remove("theme-flash"), 850);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("graphite");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mopsentry-theme");
      const known = themes.find((item) => item.id === saved);
      if (known) { setTheme(known.id); document.documentElement.dataset["theme"] = known.id; }
    } catch { /* Storage is optional. */ }
  }, []);
  const select = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem("mopsentry-theme", next); } catch { /* Keep current-session choice. */ }
  };
  return <ThemeContext.Provider value={{ theme, select }}>{children}</ThemeContext.Provider>;
}

export function ThemePicker() {
  const { theme, select } = useContext(ThemeContext);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Appearance theme">
      {themes.map((item) => (
        <Button key={item.id} variant="outline" aria-pressed={theme === item.id} onClick={() => select(item.id)} className={cn("h-12 px-3 transition-all duration-300", theme === item.id && "theme-selected border-primary bg-primary/10")}>
          <span className={cn("h-4 w-4 shrink-0 rounded-full border border-foreground/30", item.swatch)} aria-hidden="true" />
          {item.label}
        </Button>
      ))}
    </div>
  );
}