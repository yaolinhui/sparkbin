import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ContentItem } from '../types';

interface MonthViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  contents: ContentItem[];
  onSelectDate: (date: Date) => void;
}

export function MonthView({ currentDate, onDateChange, contents, onSelectDate }: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: zhCN });
    const calendarEnd = endOfWeek(monthEnd, { locale: zhCN });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const getContentsForDay = (day: Date) => {
    return contents.filter(c => {
      const contentDate = new Date(c.scheduledDate);
      return isSameDay(contentDate, day);
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-brutal-border bg-brutal-surface/50">
        <button
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          className="p-1 hover:bg-brutal-border"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-mono font-bold">
          {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
        </span>
        <button
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          className="p-1 hover:bg-brutal-border"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 border-b border-brutal-border">
        {weekDays.map((day) => (
          <div key={day} className="px-2 py-1 text-center text-xs font-mono text-brutal-muted border-r border-brutal-border last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayContents = getContentsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[80px] p-2 border-r border-b border-brutal-border last:border-r-0 cursor-pointer hover:bg-brutal-accent/5 transition-colors ${
                !isCurrentMonth ? 'bg-brutal-bg/50' : ''
              } ${isToday ? 'ring-2 ring-inset ring-brutal-accent' : ''}`}
            >
              <span className={`text-xs font-mono ${
                isToday ? 'text-brutal-accent font-bold' : isCurrentMonth ? 'text-brutal-text' : 'text-brutal-muted'
              }`}>
                {format(day, 'd')}
              </span>

              {dayContents.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayContents.slice(0, 2).map((content) => (
                    <div
                      key={content.id}
                      className={`text-xs px-1 py-0.5 truncate font-mono ${
                        content.status === 'published'
                          ? 'bg-brutal-success/20 text-brutal-success'
                          : content.status === 'scheduled'
                          ? 'bg-brutal-warning/20 text-brutal-warning'
                          : 'bg-brutal-border text-brutal-muted'
                      }`}
                    >
                      {content.title.slice(0, 8)}...
                    </div>
                  ))}
                  {dayContents.length > 2 && (
                    <div className="text-xs text-brutal-muted px-1">+{dayContents.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
