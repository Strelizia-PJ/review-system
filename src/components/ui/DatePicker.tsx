import { useState } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { DayPicker, type Matcher, type NavProps } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '../../utils/cn'

interface DatePickerProps {
  /** Selected date as YYYY-MM-DD, empty string = none */
  value: string
  onChange: (date: string) => void
  /** Minimum selectable date (YYYY-MM-DD), inclusive */
  min?: string
  /** Maximum selectable date (YYYY-MM-DD), inclusive */
  max?: string
  placeholder?: string
  className?: string
}

const dayPickerClassNames = {
  months: 'flex flex-col',
  month: 'flex flex-col gap-1',
  month_caption: 'hidden',
  nav: 'w-full',
  weekdays: 'flex flex-row',
  weekday: 'flex w-8 justify-center text-xs text-muted-foreground',
  week: 'flex flex-row',
  day: 'flex h-8 w-8 text-sm aria-selected:opacity-100',
  day_button: cn(
    'mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm text-foreground transition-colors',
    'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:text-muted-foreground/40 disabled:opacity-60 disabled:hover:bg-transparent'
  ),
  today: 'font-semibold text-primary',
  selected: 'bg-primary text-primary-foreground rounded-md',
  outside: 'text-muted-foreground/40',
  disabled: 'text-muted-foreground/40'
}

const navBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Custom header: ◀ caption ▶ on a single row, caption perfectly centered. */
function CalendarNav({ onPreviousClick, onNextClick, previousMonth, nextMonth }: NavProps) {
  // Single-month picker: displayed month is one month after `previousMonth`
  const displayed = previousMonth ? dayjs(previousMonth).add(1, 'month') : dayjs()
  return (
    <nav aria-label="导航栏" className="mb-1 grid grid-cols-[1fr_auto_1fr] items-center px-1">
      <button
        type="button"
        aria-label="前往上个月"
        aria-disabled={previousMonth ? undefined : true}
        disabled={!previousMonth}
        onClick={e => onPreviousClick?.(e)}
        className={cn(navBtn, 'justify-self-start')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="text-sm font-medium text-foreground">
        {displayed.format('YYYY年M月')}
      </span>
      <button
        type="button"
        aria-label="前往下个月"
        aria-disabled={nextMonth ? undefined : true}
        disabled={!nextMonth}
        onClick={e => onNextClick?.(e)}
        className={cn(navBtn, 'justify-self-end')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

/** Token-styled single-date picker: trigger button + popover calendar. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = '选择日期',
  className
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  const disabled: Matcher[] = []
  if (min) disabled.push({ before: new Date(`${min}T00:00:00`) })
  if (max) disabled.push({ after: new Date(`${max}T00:00:00`) })

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(dayjs(date).format('YYYY-MM-DD'))
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          !value && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {value || placeholder}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          className="z-50 rounded-xl border border-border bg-card p-3 shadow-lg focus:outline-none"
        >
          <DayPicker
            mode="single"
            locale={zhCN}
            weekStartsOn={1}
            selected={selected}
            onSelect={handleSelect}
            disabled={disabled}
            showOutsideDays
            classNames={dayPickerClassNames}
            components={{ Nav: CalendarNav }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
