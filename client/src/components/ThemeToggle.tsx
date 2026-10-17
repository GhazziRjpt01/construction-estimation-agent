import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const light = resolvedTheme === "light"
  const label = light ? "Use dark theme" : "Use light theme"

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-control text-text",
        focusRing
      )}
      aria-label={label}
      aria-pressed={light}
      title={label}
      onClick={() => setTheme(light ? "dark" : "light")}
    >
      {light ? (
        <Moon aria-hidden="true" className="size-5" />
      ) : (
        <Sun aria-hidden="true" className="size-5" />
      )}
    </button>
  )
}
