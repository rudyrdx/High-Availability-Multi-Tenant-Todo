import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Check, Trash2, Trash, Clock, Calendar as CalendarIcon, Eye, AlertOctagon } from 'lucide-react';
import { Todo, Category } from '../types';
import { clsx } from 'clsx';

interface TodoItemProps {
  todo: Todo;
  category?: Category;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, force?: boolean) => void;
  onView: (todo: Todo) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, category, onToggle, onDelete, onView }) => {
  const isCompleted = todo.is_completed;
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    if (!isDeleteHovered) {
      setIsShiftPressed(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDeleteHovered]);
  
  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const createdTime = format(parseISO(todo.created_at), 'h:mm a');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.002, backgroundColor: "rgba(255, 255, 255, 1)" }}
      whileTap={{ scale: 0.995 }}
      className={clsx(
        "group relative flex items-center p-4 mb-2 bg-white border rounded-xl shadow-sm transition-all duration-200 cursor-pointer",
        isCompleted ? "border-slate-100 bg-slate-50 opacity-75" : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      )}
      onClick={() => onView(todo)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(todo.id, isCompleted);
        }}
        className={clsx(
          "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 mr-4 focus:outline-none",
          isCompleted 
            ? "bg-green-500 border-green-500" 
            : "border-slate-300 hover:border-blue-400"
        )}
      >
        {isCompleted && <Check size={12} className="text-white stroke-[3]" />}
      </button>

      {/* Content Area */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 
            className={clsx(
              "text-sm font-semibold truncate transition-all duration-200",
              isCompleted ? "text-slate-400 line-through" : "text-slate-800"
            )}
          >
            {todo.title}
          </h3>
          {category && (
            <span 
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full text-white hidden sm:inline-block shadow-sm"
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </span>
          )}
          
          {todo.priority === 'high' && !isCompleted && (
             <div className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">High</div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
           {/* Created At Time */}
           <div className="flex items-center gap-1" title={`Created at ${format(parseISO(todo.created_at), 'PPP p')}`}>
            <Clock size={12} className="text-slate-400" />
            <span>{createdTime}</span>
          </div>

          {/* Due Date */}
          {todo.due_date && (
            <div className={clsx(
              "flex items-center gap-1",
              !isCompleted && new Date(todo.due_date) < new Date() && !isToday(parseISO(todo.due_date)) ? "text-red-500 font-medium" : ""
            )}>
              <CalendarIcon size={12} />
              <span>{formatDateDisplay(todo.due_date)}</span>
            </div>
          )}

          {todo.description && (
             <span className="truncate max-w-[200px] text-slate-400 hidden md:inline">
               {todo.description.replace(/[#*`]/g, '').substring(0, 40)}...
             </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white/90 p-1 rounded-lg backdrop-blur-sm shadow-sm border border-slate-100">
        <button 
          onMouseEnter={() => setIsDeleteHovered(true)}
          onMouseLeave={() => setIsDeleteHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo.id, e.shiftKey);
          }}
          className={clsx(
            "p-1.5 rounded-md transition-all duration-200",
            isShiftPressed 
              ? "text-red-600 bg-red-100 hover:bg-red-200" 
              : "text-slate-400 hover:text-red-500 hover:bg-red-50"
          )}
          title={isShiftPressed ? "Force Delete (No Confirmation)" : "Delete task (Shift+Click to force)"}
        >
          {isShiftPressed ? (
            <Trash size={16} strokeWidth={2.5} className="animate-pulse" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(TodoItem);