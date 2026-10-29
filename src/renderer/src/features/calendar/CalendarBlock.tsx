import type { CSSProperties, HTMLAttributes } from 'react'
import type { LaidOut } from '@shared/calendar'
import { formatTime } from '@shared/time'
import type { TimeFormat } from '@shared/types'

interface CalendarBlockProps {
  item: LaidOut
  top: number
  height: number
  timeFormat: TimeFormat
  /** Pointer/keyboard handlers from useBlockDrag; absent for the drag preview. */
  handlers?: HTMLAttributes<HTMLDivElement>
  dragging?: boolean
  ghost?: boolean
}

/** A class or event on the grid, colored like a highlighter stroke. One-off events are hatched. */
export function CalendarBlock({
  item,
  top,
  height,
  timeFormat,
  handlers,
  dragging,
  ghost
}: CalendarBlockProps): React.JSX.Element {
  const time = `${formatTime(item.start, timeFormat)} – ${formatTime(item.end, timeFormat)}`
  const style = {
    top,
    height,
    left: `calc(${(item.col / item.cols) * 100}% + 2px)`,
    width: `calc(${100 / item.cols}% - 4px)`,
    '--block': item.color
  } as CSSProperties

  return (
    <div
      className="cal-block"
      data-kind={item.kind}
      data-size={height < 34 ? 'xs' : height < 54 ? 'sm' : undefined}
      data-dragging={dragging || undefined}
      data-ghost={ghost || undefined}
      style={style}
      role={ghost ? undefined : 'button'}
      tabIndex={ghost ? undefined : 0}
      aria-label={ghost ? undefined : `${item.title || 'Untitled'}, ${time}${item.subtitle ? `, ${item.subtitle}` : ''}`}
      title={ghost ? undefined : `${item.title}\n${time}${item.subtitle ? `\n${item.subtitle}` : ''}\nDrag to move it, or drag the bottom edge to change its length`}
      {...handlers}
    >
      <div className="cal-block-title">{item.title || 'Untitled'}</div>
      <div className="cal-block-time">{time}</div>
      {item.subtitle && <div className="cal-block-sub">{item.subtitle}</div>}
      {!ghost && <div className="cal-block-handle" data-handle aria-hidden />}
    </div>
  )
}
