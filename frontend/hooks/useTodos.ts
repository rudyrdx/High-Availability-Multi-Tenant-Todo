
import { useState, useEffect, useCallback } from 'react';
import { Todo, Category, CreateTodoDTO, UpdateTodoDTO } from '../types';
import { api } from '../services/api';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const [loadedTodos, loadedCats] = await Promise.all([
          api.getTodos(),
          api.getCategories()
        ]);
        setTodos(loadedTodos);
        setCategories(loadedCats);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const addTodo = useCallback(async (dto: CreateTodoDTO) => {
    try {
      const newTodo = await api.createTodo(dto);
      setTodos(prev => [...prev, newTodo]);
      return newTodo;
    } catch (error) {
      console.error("Add failed", error);
      throw error;
    }
  }, []);

  const updateTodoDetails = useCallback(async (id: string, dto: UpdateTodoDTO) => {
    try {
      // Optimistic update
      setTodos(prev => prev.map(t => (t.id === id ? { ...t, ...dto } : t)));
      
      const updatedTodo = await api.updateTodo(id, dto);
      
      // Confirm update with server response
      setTodos(prev => prev.map(t => (t.id === id ? updatedTodo : t)));
      return updatedTodo;
    } catch (error) {
      console.error("Update failed", error);
      // We should probably revert state here in a real app, 
      // but for now we rely on the error log.
      throw error;
    }
  }, []);

  const toggleTodo = useCallback(async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, is_completed: !currentStatus } : t
    ));

    try {
      await api.updateTodo(id, { is_completed: !currentStatus });
    } catch (error) {
      // Revert on failure
      setTodos(prev => prev.map(t => 
        t.id === id ? { ...t, is_completed: currentStatus } : t
      ));
      console.error("Toggle failed", error);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    const previousTodos = [...todos];
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (error) {
      setTodos(previousTodos);
      console.error("Delete failed", error);
    }
  }, [todos]);

  const addCategory = useCallback(async (name: string, color: string) => {
    try {
      const newCat = await api.createCategory(name, color);
      setCategories(prev => [...prev, newCat]);
    } catch (e) {
      console.error("Add category failed", e);
    }
  }, []);

  return {
    todos,
    categories,
    isLoading,
    addTodo,
    updateTodoDetails,
    toggleTodo,
    deleteTodo,
    addCategory
  };
};
