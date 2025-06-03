import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { icon?: React.ReactNode }>(
  ({ className, type, icon, ...props }, ref) => {
    // Detect RTL
    const isRTL = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';
    return (
      <div className="relative w-full">
        {icon && isRTL && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            icon ? (isRTL ? "pr-10 px-3" : "pl-10 px-3") : "px-3",
            className
          )}
          ref={ref}
          {...props}
        />
        {icon && !isRTL && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
