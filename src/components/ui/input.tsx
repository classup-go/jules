import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-[#1A365D] placeholder:text-gray-400 transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/10",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#1A365D]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
