"use client"

import React from "react"
import { createPortal } from "react-dom"

function startOfDayTsLocal(d: Date) {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return dd.getTime()
}

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fromDateStrLocal(dateStr: string) {
  if (!dateStr) return NaN
  return new Date(`${dateStr}T00:00`).getTime()
}

export function DatePickerPopover({
  value,
  onChange,
  minDate,
  maxDate,
  buttonClassName = "px-2 py-1 border rounded text-sm bg-white",
}: {
  value: string
  onChange: (dateStr: string) => void
  minDate?: number
  maxDate?: number
  buttonClassName?: string
}) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [portalPos, setPortalPos] = React.useState<{ top: number; left: number } | null>(null)
  const portalRef = React.useRef<HTMLDivElement | null>(null)
  const initial = value ? new Date(`${value}T00:00`) : new Date()
  const [viewYear, setViewYear] = React.useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(initial.getMonth()) // 0-11

  React.useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00`)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Close on click outside and compute portal position
  React.useEffect(() => {
    if (!open) return

    const updatePos = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPortalPos({ top: rect.bottom + 8, left: rect.left })
    }
    updatePos()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideTrigger = !!(containerRef.current && containerRef.current.contains(target))
      const clickedInsidePortal = !!(portalRef.current && portalRef.current.contains(target as Node))
      if (!clickedInsideTrigger && !clickedInsidePortal) {
        setOpen(false)
      }
    }

    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const startWeekday = firstDayOfMonth.getDay() // 0-6, Sun=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const grid: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) grid.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push(new Date(viewYear, viewMonth, day))
  }

  const minTs = typeof minDate === 'number' ? startOfDayTsLocal(new Date(minDate)) : undefined
  const maxTs = typeof maxDate === 'number' ? startOfDayTsLocal(new Date(maxDate)) : undefined

  const selectedTs = value ? fromDateStrLocal(value) : NaN

  // Navigation helpers that respect min/max bounds
  const monthRange = React.useMemo(() => {
    const startTs = startOfDayTsLocal(new Date(viewYear, viewMonth, 1))
    const endTs = startOfDayTsLocal(new Date(viewYear, viewMonth + 1, 0))
    return { startTs, endTs }
  }, [viewYear, viewMonth])

  const canGoPrev = React.useMemo(() => {
    if (minTs === undefined) return true
    const prevEnd = startOfDayTsLocal(new Date(viewYear, viewMonth, 0)) // last day of previous month
    return prevEnd >= minTs
  }, [viewYear, viewMonth, minTs])

  const canGoNext = React.useMemo(() => {
    if (maxTs === undefined) return true
    const nextStart = startOfDayTsLocal(new Date(viewYear, viewMonth + 1, 1)) // first day of next month
    return nextStart <= maxTs
  }, [viewYear, viewMonth, maxTs])

  const goPrevMonth = () => {
    if (!canGoPrev) return
    const m = viewMonth - 1
    if (m < 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(m)
    }
  }

  const goNextMonth = () => {
    if (!canGoNext) return
    const m = viewMonth + 1
    if (m > 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(m)
    }
  }

  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" className={buttonClassName} onClick={() => setOpen(o => !o)}>
        {value ? new Date(`${value}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select date'}
      </button>
      {open && portalPos && typeof window !== 'undefined' && typeof document !== 'undefined' && (
          createPortal(
            <div ref={portalRef} className="fixed z-[9999] w-[16rem] rounded-md border bg-white shadow-xl p-2" style={{ top: portalPos.top, left: portalPos.left }}>
              <div className="flex items-center justify-between mb-2">
                <button type="button" disabled={!canGoPrev} onClick={goPrevMonth} className={["px-2 py-1 text-sm rounded", !canGoPrev ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"].join(" ")}>‹</button>
                <div className="text-sm font-medium">
                  {new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <button type="button" disabled={!canGoNext} onClick={goNextMonth} className={["px-2 py-1 text-sm rounded", !canGoNext ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"].join(" ")}>›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
                {weekdays.map(d => (<div key={d} className="text-center">{d}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d, idx) => {
                  if (!d) return <div key={idx} />
                  const ts = startOfDayTsLocal(d)
                  const disabled = (minTs !== undefined && ts < minTs) || (maxTs !== undefined && ts > maxTs)
                  const isSelected = !isNaN(selectedTs) && ts === selectedTs
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => { if (!disabled) { onChange(toDateStr(d)); setOpen(false) } }}
                      className={[
                        "h-8 w-8 text-sm rounded flex items-center justify-center",
                        disabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-50",
                        isSelected ? "bg-blue-600 text-white hover:bg-blue-600" : ""
                      ].join(" ")}
                      title={d.toDateString()}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body
          )
      )}
    </div>
  )
}
