import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-[#1A365D] placeholder:text-gray-400 transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        "focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/10",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
