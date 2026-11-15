import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#1A365D]/20",
  {
    variants: {
      variant: {
        default: "bg-[#1A365D] text-white hover:bg-[#1A365D]/90 rounded-xl",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#EF4444]/90 rounded-xl",
        outline:
          "border border-gray-200 bg-white hover:bg-gray-50 text-[#1A365D] rounded-xl",
        secondary:
          "bg-[#E8F4FD] text-[#1A365D] hover:bg-[#E8F4FD]/80 rounded-xl",
        ghost:
          "hover:bg-[#E8F4FD] text-[#1A365D] rounded-xl",
        link: "text-[#1A365D] underline-offset-4 hover:underline",
        orange: "bg-[#F5A623] text-white hover:bg-[#F5A623]/90 rounded-xl",
      },
      size: {
        default: "h-12 px-4 py-3.5 has-[>svg]:px-3",
        sm: "h-10 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-14 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-12 rounded-xl",
        "icon-sm": "size-10 rounded-xl",
        "icon-lg": "size-14 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
