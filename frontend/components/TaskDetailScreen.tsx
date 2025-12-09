import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { 
  X, Calendar, Clock, Tag, Flag, Edit3, Trash2, Check, 
  Bold, Italic, List, Type, Code, Eye, PenTool, ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { marked } from 'marked';
import { clsx } from 'clsx';
import { Category, Todo, CreateTodoDTO, UpdateTodoDTO } from '../types';

interface TaskDetailScreenProps {
  todo: Todo | null; // null means creating new
  categories: Category[];
  onSave: (dto: CreateTodoDTO | UpdateTodoDTO) => Promise<void>;
  onDelete?: (id: string) => void;
  onBack: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const MarkdownEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  previewMode: boolean 
}> = ({ value, onChange, previewMode }) => {
  
  const insertFormat = (startTag: string, endTag: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = `${before}${startTag}${selection}${endTag}${after}`;
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  if (previewMode) {
    if (!value.trim()) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
          No description provided.
        </div>
      )
    }
    const html = marked.parse(value);
    return (
      <div 
        className="markdown-content prose prose-slate prose-sm md:prose-base max-w-none p-4 md:p-6 bg-white rounded-lg min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: html as string }} 
      />
    );
  }

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        <button type="button" onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Italic">
          <Italic size={16} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1 flex-shrink-0" />
        <button type="button" onClick={() => insertFormat('# ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Heading 1">
          <Type size={16} />
        </button>
        <button type="button" onClick={() => insertFormat('## ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Heading 2">
          <Type size={14} />
        </button>
        <button type="button" onClick={() => insertFormat('- ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="List">
          <List size={16} />
        </button>
        <button type="button" onClick={() => insertFormat('`', '`')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Inline Code">
          <Code size={16} />
        </button>
        <button type="button" onClick={() => insertFormat('\n```\n', '\n```')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Code Block">
          <Code size={16} className="font-bold" />
        </button>
      </div>
      <textarea
        id="markdown-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[300px] p-4 resize-y outline-none text-slate-700 font-mono text-sm leading-relaxed"
        placeholder="Add details, checklists, or notes here..."
      />
    </div>
  );
};

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
  todo,
  categories,
  onSave,
  onDelete,
  onBack,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [catId, setCatId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Reset/Initialize state when todo changes
  useEffect(() => {
    if (todo) {
      // View/Edit Existing
      setIsEditing(false); // Default to view mode for existing
      setTitle(todo.title);
      setDescription(todo.description || '');
      setCatId(todo.category_id || '');
      setPriority(todo.priority);
      if (todo.due_date) {
        const d = parseISO(todo.due_date);
        setDate(format(d, 'yyyy-MM-dd'));
        setTime(format(d, 'HH:mm'));
      } else {
        setDate('');
        setTime('');
      }
      setActiveTab('preview');
    } else {
      // Create New
      setIsEditing(true);
      setTitle('');
      setDescription('');
      setCatId(categories[0]?.id || '');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime('12:00');
      setPriority('medium');
      setActiveTab('write');
    }
  }, [todo, categories]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    
    try {
      let dueDateIso = null;
      if (date) {
        dueDateIso = time ? new Date(`${date}T${time}`).toISOString() : new Date(date).toISOString();
      }

      const dto: any = {
        title,
        description,
        category_id: catId || null,
        due_date: dueDateIso,
        priority
      };
      
      if (!todo) {
        dto.is_completed = false;
      }

      await onSave(dto);
      setIsEditing(false); // Switch back to view mode after save
      if (!todo) onBack(); // If creating new, go back to list on save
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategory = categories.find(c => c.id === catId);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Navbar / Toolbar */}
      <div className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-200 bg-white z-10 sticky top-0">
        <div className="flex items-center gap-2">
           <button 
             onClick={onBack}
             className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
           >
             <ArrowLeft size={18} />
             Back
           </button>
           
           <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
           
           {/* Navigation Arrows */}
           {todo && (
             <div className="flex items-center bg-slate-100 rounded-lg p-0.5 ml-2">
               <button 
                 onClick={onPrev}
                 disabled={!hasPrev}
                 className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 rounded-md transition-colors"
                 title="Previous Task"
               >
                 <ChevronLeft size={18} />
               </button>
               <button 
                 onClick={onNext}
                 disabled={!hasNext}
                 className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 rounded-md transition-colors"
                 title="Next Task"
               >
                 <ChevronRight size={18} />
               </button>
             </div>
           )}
        </div>

        <div className="flex items-center gap-3">
           {!isEditing && onDelete && todo && (
              <button 
                onClick={() => {
                  if(window.confirm('Are you sure you want to delete this task?')) {
                    onDelete(todo.id);
                    onBack();
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Delete Task"
              >
                <Trash2 size={18} />
              </button>
            )}
            
            {isEditing ? (
               <div className="flex gap-2">
                 <button
                   onClick={() => {
                     if(!todo) onBack(); // Cancel create
                     else setIsEditing(false); // Cancel edit
                   }}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm"
                 >
                   Cancel
                 </button>
                 <button 
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
                 >
                   {isSaving ? 'Saving...' : 'Save Changes'}
                 </button>
               </div>
            ) : (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  setActiveTab('write');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm text-sm"
              >
                <Edit3 size={16} />
                Edit Task
              </button>
            )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
         <div className="max-w-3xl mx-auto px-6 py-10">
           
           {/* Header Region */}
           <div className="mb-8">
             {isEditing ? (
               <input
                 type="text"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="Task Title"
                 className="w-full text-3xl font-bold text-slate-800 placeholder:text-slate-300 border-none outline-none bg-transparent"
                 autoFocus={!todo} 
               />
             ) : (
               <div className="flex items-start gap-4">
                 <div className="mt-1">
                   {todo?.is_completed ? (
                     <div className="p-1 bg-green-100 text-green-600 rounded-full"><Check size={20} strokeWidth={3} /></div>
                   ) : (
                     <div className={clsx("w-6 h-6 rounded-full border-2 mt-1.5", 
                        priority === 'high' ? "border-red-400" : "border-slate-300"
                     )} />
                   )}
                 </div>
                 <h1 className={clsx("text-3xl font-bold text-slate-900 leading-tight", todo?.is_completed && "text-slate-400 line-through")}>
                   {title}
                 </h1>
               </div>
             )}
           </div>

           {/* Properties Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 p-5 bg-slate-50/80 rounded-xl border border-slate-100">
              
              {/* Category Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Tag size={12} /> Category
                </div>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCatId(cat.id)}
                        className={clsx(
                          "px-3 py-1 text-sm rounded-md border transition-all",
                          catId === cat.id 
                            ? "border-transparent text-white shadow-sm ring-1 ring-offset-1 ring-offset-slate-50"
                            : "border-slate-200 text-slate-600 hover:bg-white bg-white"
                        )}
                        style={{ 
                          backgroundColor: catId === cat.id ? cat.color : undefined,
                          '--tw-ring-color': cat.color 
                        } as any}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                ) : (
                   <span 
                    className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-md text-white shadow-sm"
                    style={{ backgroundColor: currentCategory?.color || '#cbd5e1' }}
                   >
                     {currentCategory?.name || 'Uncategorized'}
                   </span>
                )}
              </div>

              {/* Priority Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                   <Flag size={12} /> Priority
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={clsx(
                          "px-3 py-1 text-sm font-medium uppercase rounded-md border transition-all",
                          priority === p 
                             ? (p === 'high' ? "bg-red-50 text-red-700 border-red-200" : p === 'medium' ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200")
                             : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : (
                   <div className="flex items-center gap-2">
                     <span className={clsx(
                       "w-2 h-2 rounded-full",
                       priority === 'high' ? "bg-red-500" : priority === 'medium' ? "bg-yellow-500" : "bg-green-500"
                     )} />
                     <span className="text-sm font-medium text-slate-700 capitalize">{priority} Priority</span>
                   </div>
                )}
              </div>

              {/* Date Field */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Calendar size={12} /> Due Date
                </div>
                {isEditing ? (
                   <div className="flex flex-wrap gap-4">
                     <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                    <input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                   </div>
                ) : (
                   <div className="flex items-center gap-3 text-sm text-slate-700">
                     <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="font-medium">{date ? format(new Date(date), 'MMMM d, yyyy') : 'No Date Set'}</span>
                     </div>
                     {time && (
                       <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
                          <Clock size={14} className="text-slate-400" />
                          <span className="font-medium">{time}</span>
                       </div>
                     )}
                   </div>
                )}
              </div>
           </div>

           {/* Description Section */}
           <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                   <Type size={12} /> Description & Notes
                 </div>
                 {isEditing && (
                   <div className="flex bg-slate-100 rounded-lg p-0.5">
                      <button 
                        onClick={() => setActiveTab('write')}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-all",
                          activeTab === 'write' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        Write
                      </button>
                      <button 
                        onClick={() => setActiveTab('preview')}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-all",
                          activeTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        Preview
                      </button>
                   </div>
                 )}
              </div>
              
              <MarkdownEditor 
                 value={description} 
                 onChange={setDescription} 
                 previewMode={!isEditing || activeTab === 'preview'} 
               />
           </div>

           {/* Timestamps Footer */}
           {!isEditing && todo && (
             <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 space-y-1">
               <div className="flex items-center gap-2">
                 <span>Created {format(parseISO(todo.created_at), 'MMM d, yyyy @ h:mm a')}</span>
               </div>
               {todo.updated_at && (
                 <div>Last updated {format(parseISO(todo.updated_at), 'MMM d, yyyy @ h:mm a')}</div>
               )}
             </div>
           )}

         </div>
      </div>
    </div>
  );
};

export default TaskDetailScreen;