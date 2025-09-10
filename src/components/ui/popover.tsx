"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Lightweight, dependency-free popover implementation compatible with our usage.
// API surface: <Popover><PopoverTrigger asChild>…</PopoverTrigger><PopoverContent/></Popover>

type PopoverCtx = {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLElement>
}
const Ctx = React.createContext<PopoverCtx | null>(null)

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current && !containerRef.current.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <Ctx.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function PopoverTrigger({ asChild, children }: { asChild?: boolean, children: React.ReactElement }) {
  const ctx = React.useContext(Ctx)
  if (!ctx) return children

  const props = {
    ref: ctx.triggerRef as any,
    onClick: (e: any) => { e.stopPropagation(); ctx.setOpen(!ctx.open) },
    'aria-haspopup': 'dialog',
    'aria-expanded': ctx.open,
  }

  return asChild ? React.cloneElement(children, props) : (
    <button {...props} className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm">
      {children}
    </button>
  )
}

export const PopoverAnchor = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function PopoverAnchor(props, ref) {
    return <div ref={ref} {...props} />
  }
)

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }>(
  function PopoverContent({ className, sideOffset = 8, style, ...props }, ref) {
    const ctx = React.useContext(Ctx)
    if (!ctx || !ctx.open) return null
    return (
      <div
        ref={ref}
        role="dialog"
        className={cn(
          "absolute z-50 mt-2 right-0 min-w-[12rem] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          className
        )}
        style={{ marginTop: sideOffset, ...style }}
        {...props}
      />
    )
  }
)

