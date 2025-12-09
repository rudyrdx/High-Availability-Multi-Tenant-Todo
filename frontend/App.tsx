import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  format, 
  isSameDay, 
  parseISO, 
  startOfDay, 
  isAfter 
} from 'date-fns';
import { Menu, Plus, CheckSquare, LogOut } from 'lucide-react';

import { Todo, ViewType, CreateTodoDTO, UpdateTodoDTO } from './types';
import Sidebar from './components/Sidebar';
import TodoItem from './components/TodoItem';
import TaskDetailScreen from './components/TaskDetailScreen';
import ConfirmModal from './components/ConfirmModal';
import AuthScreen from './components/AuthScreen';
import { useTodos } from './hooks/useTodos';
import { api } from './services/api';

// --- DASHBOARD COMPONENT ---
// Encapsulates the entire app logic once logged in
const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { 
    todos, 
    categories, 
    isLoading, 
    addTodo, 
    updateTodoDetails,
    toggleTodo, 
    deleteTodo, 
    addCategory 
  } = useTodos();

  const [currentView, setCurrentView] = useState<ViewType>(ViewType.TODAY);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Navigation / View State
  const [viewState, setViewState] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; todoId: string | null }>({
    isOpen: false,
    todoId: null,
  });

  const filteredTodos = useMemo(() => {
    let result = todos;

    switch (currentView) {
      case ViewType.TODAY:
        result = result.filter(t => t.due_date && isSameDay(parseISO(t.due_date), new Date()));
        break;
      case ViewType.UPCOMING:
        result = result.filter(t => t.due_date && isAfter(parseISO(t.due_date), startOfDay(new Date())));
        break;
      case ViewType.CATEGORY:
        if (selectedCategoryId) {
          result = result.filter(t => t.category_id === selectedCategoryId);
        }
        break;
      default:
        break;
    }

    if ((currentView === ViewType.TODAY) && !isSameDay(selectedDate, new Date())) {
       result = todos.filter(t => t.due_date && isSameDay(parseISO(t.due_date), selectedDate));
    }

    return result.sort((a, b) => {
      if (a.is_completed === b.is_completed) {
        return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
      }
      return a.is_completed ? 1 : -1;
    });
  }, [todos, currentView, selectedCategoryId, selectedDate]);

  const currentTodoIndex = useMemo(() => {
    if (!selectedTodoId) return -1;
    return filteredTodos.findIndex(t => t.id === selectedTodoId);
  }, [filteredTodos, selectedTodoId]);

  const hasNext = currentTodoIndex >= 0 && currentTodoIndex < filteredTodos.length - 1;
  const hasPrev = currentTodoIndex > 0;

  const handleNextTask = () => {
    if (hasNext) setSelectedTodoId(filteredTodos[currentTodoIndex + 1].id);
  };

  const handlePrevTask = () => {
    if (hasPrev) setSelectedTodoId(filteredTodos[currentTodoIndex - 1].id);
  };

  const todosDates = useMemo(() => {
    return todos
      .filter(t => t.due_date && !t.is_completed)
      .map(t => parseISO(t.due_date!));
  }, [todos]);

  const handleViewChange = (view: ViewType, catId?: string) => {
    setCurrentView(view);
    if (catId) setSelectedCategoryId(catId);
    else setSelectedCategoryId(null);
    if (view === ViewType.TODAY) setSelectedDate(new Date());
    setViewState('LIST');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentView(ViewType.TODAY); 
    setSelectedCategoryId(null);
    setViewState('LIST');
  };

  const openCreateTask = () => {
    setSelectedTodoId(null);
    setViewState('DETAIL');
  };

  const openViewTask = (todo: Todo) => {
    setSelectedTodoId(todo.id);
    setViewState('DETAIL');
  };

  const handleSaveTask = async (dto: CreateTodoDTO | UpdateTodoDTO) => {
    if (selectedTodoId) {
      await updateTodoDetails(selectedTodoId, dto as UpdateTodoDTO);
    } else {
      await addTodo(dto as CreateTodoDTO);
    }
  };

  const handleDeleteRequest = (id: string, force?: boolean) => {
    if (force) deleteTodo(id);
    else setConfirmDialog({ isOpen: true, todoId: id });
  };

  const handleConfirmDelete = () => {
    if (confirmDialog.todoId) {
      deleteTodo(confirmDialog.todoId);
      setConfirmDialog({ isOpen: false, todoId: null });
    }
  };

  const viewTitle = useMemo(() => {
    if (currentView === ViewType.CATEGORY) {
      return categories.find(c => c.id === selectedCategoryId)?.name || 'Category';
    }
    if (currentView === ViewType.ALL) return 'All Tasks';
    if (currentView === ViewType.UPCOMING) return 'Upcoming';
    if (isSameDay(selectedDate, new Date())) return 'Today';
    return format(selectedDate, 'EEEE, MMMM do');
  }, [currentView, selectedCategoryId, categories, selectedDate]);

  const activeTodo = useMemo(() => 
    todos.find(t => t.id === selectedTodoId) || null
  , [todos, selectedTodoId]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        categories={categories}
        currentView={currentView}
        selectedCategoryId={selectedCategoryId}
        onViewChange={handleViewChange}
        onAddCategory={addCategory}
        todosDates={todosDates}
        selectedDate={selectedDate}
        onDateChange={handleDateSelect}
        isMobileOpen={isMobileNavOpen}
        closeMobile={() => setMobileNavOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {viewState === 'LIST' ? (
          <>
            <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-200 bg-white/50 backdrop-blur-md z-30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{viewTitle}</h1>
                  <p className="text-xs text-slate-500 font-medium hidden sm:block">
                    {filteredTodos.filter(t => !t.is_completed).length} incomplete tasks
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onLogout}
                  className="hidden md:flex p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                <button 
                  onClick={openCreateTask}
                  className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                  <span>Add Task</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2 md:hidden">
                <button onClick={onLogout} className="p-2 text-slate-500"><LogOut size={20}/></button>
                <button 
                  onClick={openCreateTask}
                  className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-5xl w-full mx-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-slate-400">Loading your schedule...</p>
                </div>
              ) : (
                <>
                  {filteredTodos.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center h-64 text-center"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <CheckSquare size={32} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
                      <p className="text-slate-500 max-w-xs mx-auto mt-2">
                        No tasks found for this view. Enjoy your free time or add a new task to get started.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-1 pb-20">
                      <AnimatePresence mode="popLayout">
                        {filteredTodos.map(todo => (
                          <TodoItem 
                            key={todo.id} 
                            todo={todo} 
                            category={categories.find(c => c.id === todo.category_id)}
                            onToggle={toggleTodo}
                            onDelete={handleDeleteRequest}
                            onView={openViewTask}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <TaskDetailScreen
            todo={activeTodo}
            categories={categories}
            onSave={handleSaveTask}
            onDelete={deleteTodo}
            onBack={() => setViewState('LIST')}
            onNext={handleNextTask}
            onPrev={handlePrevTask}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
        )}
      </main>

      <AnimatePresence>
        {confirmDialog.isOpen && (
          <ConfirmModal 
            isOpen={confirmDialog.isOpen}
            onClose={() => setConfirmDialog({ isOpen: false, todoId: null })}
            onConfirm={handleConfirmDelete}
            title="Delete Task"
            message="Are you sure you want to delete this task? This action cannot be undone."
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN APP (ORCHESTRATOR) ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check local storage for session on mount
    const session = api.getSession();
    if (session) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    // Force reload/reset state might be cleaner in a real app, 
    // but here unmounting Dashboard works fine to reset hooks
  };

  if (isCheckingAuth) {
    return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <>
      {!isAuthenticated ? (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
