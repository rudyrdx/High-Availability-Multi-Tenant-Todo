import React from 'react';
import { 
  format, 
  startOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek,
  isToday,
  addDays
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates: Date[]; // Dates that have todos
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onSelectDate, markedDates }) => {
  // Local state for navigation (browsing months without changing selection immediately)
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDate));

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    // Always render 6 weeks (42 days) to prevent height jumping between months
    const endDate = addDays(startDate, 41);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    onSelectDate(today);
  };

  const hasTodo = (day: Date) => {
    return markedDates.some(d => isSameDay(d, day));
  };

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-semibold text-slate-700">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2 text-xs font-medium text-slate-400 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          const marked = hasTodo(day);

          return (
            <div key={idx} className="relative flex justify-center h-8 items-center">
              <button
                onClick={() => onSelectDate(day)}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10",
                  !isCurrentMonth && "text-slate-300",
                  isCurrentMonth && "text-slate-700 hover:bg-slate-100",
                  isSelected && "bg-blue-600 text-white shadow-md hover:bg-blue-700 font-semibold",
                  isDayToday && !isSelected && "text-blue-600 font-bold bg-blue-50"
                )}
              >
                {format(day, 'd')}
              </button>
              {marked && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full z-20"></div>
              )}
            </div>
          );
        })}
      </div>
      
      <button 
        onClick={goToToday}
        className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700 w-full text-left px-2"
      >
        Jump to Today
      </button>
    </div>
  );
};

export default React.memo(MiniCalendar);