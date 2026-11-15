import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[#E8F4FD] text-[#1A365D] border-none",
        secondary:
          "bg-[#E8F4FD] text-[#1A365D] border-none",
        destructive:
          "bg-[#EF4444]/10 text-[#EF4444] border-none",
        outline:
          "border border-gray-200 bg-white text-[#1A365D] [a&]:hover:bg-gray-50",
        orange:
          "bg-[#FFF8E7] text-[#F5A623] border-none",
        success:
          "bg-[#22C55E]/10 text-[#22C55E] border-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
