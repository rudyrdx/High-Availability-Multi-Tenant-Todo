import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTodos } from './useTodos';
import { api } from '../services/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTodos Hook', () => {
  beforeEach(async () => {
    localStorage.clear();
    mockFetch.mockClear();
    (api as any).session = null;

    // Mock createWorkspace response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        tenant: { id: 'tenant_hook', name: 'Hook Test', slug: 'hook' },
        user: {
          id: 'user_hook',
          tenant_id: 'tenant_hook',
          email: 'hook@test.com',
          username: 'Hook User',
          created_at: new Date().toISOString()
        },
        token: 'mock-jwt-token',
      }),
    });

    // Simulate logged in state
    await api.createWorkspace('Hook Test', 'hook', 'hook@test.com', 'Hook User', 'chronos-beta', 'password123');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch initial todos', async () => {
    // Mock getTodos response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todos: [] }),
    });

    const { result } = renderHook(() => useTodos());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos).toEqual([]); // New workspace has no todos initially
  });

  it('should add a todo', async () => {
    // Mock initial getTodos
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todos: [] }),
    });

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newTodo = {
      id: 'todo_hook_1',
      user_id: 'user_hook',
      tenant_id: 'tenant_hook',
      title: 'Hook Todo',
      is_completed: false,
      priority: 'low' as const,
      due_date: null,
      category_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    // Mock createTodo response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todo: newTodo }),
    });

    await act(async () => {
      await result.current.addTodo({
        title: 'Hook Todo',
        is_completed: false,
        priority: 'low',
        due_date: null,
        category_id: null
      });
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].title).toBe('Hook Todo');
  });

  it('should toggle a todo completion status', async () => {
    // Mock initial getTodos
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todos: [] }),
    });

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let todoId = '';

    const newTodo = {
      id: 'todo_toggle',
      user_id: 'user_hook',
      tenant_id: 'tenant_hook',
      title: 'Toggle Me',
      is_completed: false,
      priority: 'low' as const,
      due_date: null,
      category_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    // Mock createTodo response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todo: newTodo }),
    });

    // Add todo
    await act(async () => {
      const todo = await result.current.addTodo({
        title: 'Toggle Me',
        is_completed: false,
        priority: 'low',
        due_date: null,
        category_id: null
      });
      todoId = todo.id;
    });

    const updatedTodo = {
      ...newTodo,
      is_completed: true,
      completed_at: new Date().toISOString(),
    };

    // Mock updateTodo response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todo: updatedTodo }),
    });

    // Toggle
    await act(async () => {
      await result.current.toggleTodo(todoId, false);
    });

    expect(result.current.todos[0].is_completed).toBe(true);
  });
});
