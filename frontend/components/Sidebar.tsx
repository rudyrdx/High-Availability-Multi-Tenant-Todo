
import React, { useState, useRef, useEffect } from 'react';
import { Layout, Calendar, CheckSquare, List, Plus, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Category, ViewType } from '../types';
import MiniCalendar from './MiniCalendar';

interface SidebarProps {
  categories: Category[];
  currentView: ViewType;
  selectedCategoryId: string | null;
  onViewChange: (view: ViewType, categoryId?: string) => void;
  onAddCategory: (name: string, color: string) => void;
  todosDates: Date[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

const Sidebar: React.FC<SidebarProps> = ({
  categories,
  currentView,
  selectedCategoryId,
  onViewChange,
  onAddCategory,
  todosDates,
  selectedDate,
  onDateChange,
  isMobileOpen,
  closeMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingCategory && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreatingCategory]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      onAddCategory(newCategoryName.trim(), randomColor);
      setNewCategoryName('');
      setIsCreatingCategory(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const NavItem: React.FC<{ 
    view?: ViewType, 
    label: string, 
    icon: any, 
    active: boolean, 
    onClick: () => void 
  }> = ({ 
    view, 
    label, 
    icon: Icon, 
    active, 
    onClick 
  }) => (
    <button
      onClick={() => {
        onClick();
        if (window.innerWidth < 768) closeMobile();
      }}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
        active 
          ? "bg-blue-50 text-blue-700" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon size={18} className={clsx(active ? "text-blue-600" : "text-slate-400")} />
      {label}
    </button>
  );

  return (
    <>
      {/* Mobile Overlay - Optional since we are full width, but good for fade effect backing */}
      <div 
        className={clsx(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobile}
      />

      {/* Sidebar Container */}
      <aside 
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none",
          "h-[100dvh]", // Dynamic Viewport Height
          "w-full md:w-80 md:translate-x-0", // Full width on mobile, 80 on desktop
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 1. Header (Fixed) */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-md">
              <CheckSquare size={20} strokeWidth={3} />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">Chronos</span>
          </div>
          
          <button 
            onClick={closeMobile} 
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg active:scale-95 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* 2. Middle Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col min-h-0">
          
          {/* Main Tasks Nav */}
          <div className="mb-8 flex-shrink-0">
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks</h3>
            <NavItem 
              view={ViewType.TODAY} 
              label="Today" 
              icon={Layout} 
              active={currentView === ViewType.TODAY} 
              onClick={() => onViewChange(ViewType.TODAY)} 
            />
            <NavItem 
              view={ViewType.UPCOMING} 
              label="Upcoming" 
              icon={Calendar} 
              active={currentView === ViewType.UPCOMING} 
              onClick={() => onViewChange(ViewType.UPCOMING)} 
            />
            <NavItem 
              view={ViewType.ALL} 
              label="All Tasks" 
              icon={List} 
              active={currentView === ViewType.ALL} 
              onClick={() => onViewChange(ViewType.ALL)} 
            />
          </div>

          {/* Lists Section - Flows naturally in the scroll container */}
          <div className="mb-4">
             <div className="flex items-center justify-between px-3 mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lists</h3>
                <button 
                  onClick={() => setIsCreatingCategory(true)}
                  className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded"
                  title="Create new list"
                >
                  <Plus size={16} />
                </button>
             </div>

             {/* Search Bar */}
             <div className="px-2 mb-3">
               <div className="relative group">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Search lists..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                 />
                 {searchQuery && (
                   <button 
                     onClick={() => setSearchQuery('')}
                     className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                   >
                     <X size={12} />
                   </button>
                 )}
               </div>
             </div>
             
             {/* List Items */}
             <div className="space-y-0.5 pb-4">
               {/* New Category Input */}
               {isCreatingCategory && (
                 <form onSubmit={handleCreateCategory} className="px-3 py-2 mb-1">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                     <input
                       ref={createInputRef}
                       type="text"
                       value={newCategoryName}
                       onChange={(e) => setNewCategoryName(e.target.value)}
                       placeholder="List name..."
                       className="flex-1 bg-transparent border-b border-blue-500 text-sm focus:outline-none py-1"
                       onBlur={() => !newCategoryName && setIsCreatingCategory(false)}
                       onKeyDown={(e) => e.key === 'Escape' && setIsCreatingCategory(false)}
                     />
                   </div>
                 </form>
               )}

               {filteredCategories.length === 0 && searchQuery ? (
                 <div className="text-center py-4 text-xs text-slate-400 italic">
                   No lists found
                 </div>
               ) : (
                 filteredCategories.map(cat => (
                   <NavItem
                    key={cat.id}
                    label={cat.name}
                    icon={() => <div className="w-2 h-2 rounded-full ring-2 ring-opacity-50 flex-shrink-0" style={{ backgroundColor: cat.color, '--tw-ring-color': cat.color } as React.CSSProperties} />}
                    active={currentView === ViewType.CATEGORY && selectedCategoryId === cat.id}
                    onClick={() => onViewChange(ViewType.CATEGORY, cat.id)}
                   />
                 ))
               )}
             </div>
          </div>
        </div>

        {/* 3. Footer / Calendar (Fixed) */}
        <div className="flex-shrink-0 border-t border-slate-100 p-4 bg-slate-50 z-10 pb-safe-area">
          <MiniCalendar 
            selectedDate={selectedDate} 
            onSelectDate={(d) => {
              onDateChange(d);
              if (window.innerWidth < 768) closeMobile();
            }}
            markedDates={todosDates}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
