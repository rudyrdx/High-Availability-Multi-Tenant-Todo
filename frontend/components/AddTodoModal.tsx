
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Category, CreateTodoDTO, Todo, UpdateTodoDTO } from '../types';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (todo: CreateTodoDTO) => void;
  onUpdate?: (id: string, todo: UpdateTodoDTO) => void;
  categories: Category[];
  todo?: Todo | null; // If present, we are in Edit mode
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  categories,
  todo
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [catId, setCatId] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Initialize form based on 'todo' prop or default values
  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description || '');
        setCatId(todo.category_id || (categories.length > 0 ? categories[0].id : ''));
        setPriority(todo.priority);
        
        if (todo.due_date) {
          const parsedDate = parseISO(todo.due_date);
          setDate(format(parsedDate, 'yyyy-MM-dd'));
          setTime(format(parsedDate, 'HH:mm'));
        } else {
          setDate(format(new Date(), 'yyyy-MM-dd'));
          setTime('12:00');
        }
      } else {
        // Reset for Add Mode
        setTitle('');
        setDescription('');
        setCatId(categories.length > 0 ? categories[0].id : '');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setTime('12:00');
        setPriority('medium');
      }
    }
  }, [isOpen, todo, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dateTime = new Date(`${date}T${time}`);

    if (todo && onUpdate) {
      // Edit Mode
      onUpdate(todo.id, {
        title,
        description,
        category_id: catId || null,
        due_date: dateTime.toISOString(),
        priority
      });
    } else {
      // Add Mode
      onAdd({
        title,
        description,
        category_id: catId || null,
        is_completed: false,
        due_date: dateTime.toISOString(),
        priority
      });
    }
    
    onClose();
  };

  if (!isOpen) return null;

  const isEditMode = !!todo;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden"
      >
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {isEditMode ? 'Edit Task' : 'New Task'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="What needs to be done?"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
             </div>
             <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
              <input 
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
             </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
             <div className="flex gap-2 flex-wrap">
               {categories.map(cat => (
                 <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatId(cat.id)}
                  className={`px-3 py-1 text-sm rounded-full border transition-all ${catId === cat.id ? 'border-transparent text-white shadow-md' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={{ backgroundColor: catId === cat.id ? cat.color : 'transparent' }}
                 >
                   {cat.name}
                 </button>
               ))}
             </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Priority</label>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
               {['low', 'medium', 'high'].map((p) => (
                 <button
                   key={p}
                   type="button"
                   onClick={() => setPriority(p as any)}
                   className={`flex-1 py-1.5 text-xs font-medium uppercase rounded-md transition-all ${priority === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   {p}
                 </button>
               ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description (Optional)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isEditMode ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddTodoModal;
