import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the singleton session for isolation
    (api as any).session = null;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should check tenant successfully', async () => {
    const mockTenant = { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ tenant: mockTenant }),
    });

    const tenant = await api.checkTenant('acme');

    expect(tenant).toEqual(mockTenant);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/tenant/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tenantName: 'acme' }),
      })
    );
  });

  it('should create a workspace successfully', async () => {
    const mockResponse = {
      tenant: { id: 'tenant_test', name: 'Test Corp', slug: 'testcorp' },
      user: {
        id: 'user_test',
        tenant_id: 'tenant_test',
        email: 'admin@testcorp.com',
        username: 'Admin User',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const session = await api.createWorkspace(
      'Test Corp',
      'testcorp',
      'admin@testcorp.com',
      'Admin User',
      'chronos-beta',
      'password123'
    );

    expect(session).toBeDefined();
    expect(session.tenant.name).toBe('Test Corp');
    expect(session.user.email).toBe('admin@testcorp.com');
    expect(session.token).toBe('mock-jwt-token');

    // Verify session persistence
    const storedSession = JSON.parse(localStorage.getItem('chronos_session') || '{}');
    expect(storedSession.token).toBe('mock-jwt-token');
  });

  it('should fail to create workspace with invalid invite key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Invalid invite key' }),
    });

    await expect(
      api.createWorkspace('Bad Corp', 'bad', 'bad@corp.com', 'Bad', 'wrong-key', 'password123')
    ).rejects.toThrow('Invalid invite key');
  });

  it('should login an existing user', async () => {
    const mockResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const session = await api.login('tenant_acme', 'alice@acme.com', 'password123');

    expect(session.user.username).toBe('Alice Acme');
    expect(session.tenant.id).toBe('tenant_acme');
    expect(api.getSession()).toEqual(session);
  });

  it('should create a todo for authenticated user', async () => {
    // First, mock login
    const loginResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => loginResponse,
    });

    await api.login('tenant_acme', 'alice@acme.com', 'password123');

    // Mock create todo
    const todoDto = {
      title: 'Test Vitest',
      description: 'Testing code',
      is_completed: false,
      due_date: new Date().toISOString(),
      priority: 'high' as const,
      category_id: null
    };

    const mockTodo = {
      ...todoDto,
      id: 'todo_test',
      user_id: 'user_01',
      tenant_id: 'tenant_acme',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todo: mockTodo }),
    });

    const newTodo = await api.createTodo(todoDto);

    expect(newTodo.id).toBeDefined();
    expect(newTodo.title).toBe('Test Vitest');
    expect(newTodo.user_id).toBe('user_01');
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3000/api/todos',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-jwt-token',
        }),
      })
    );
  });

  it('should get todos for authenticated user', async () => {
    // Mock login
    const loginResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => loginResponse,
    });

    await api.login('tenant_acme', 'alice@acme.com', 'password123');

    // Mock get todos
    const mockTodos = [
      {
        id: 'todo_01',
        user_id: 'user_01',
        tenant_id: 'tenant_acme',
        title: 'Test Todo',
        description: 'Test',
        is_completed: false,
        due_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        priority: 'medium' as const,
        category_id: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ todos: mockTodos }),
    });

    const todos = await api.getTodos();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Test Todo');
  });

  it('should delete a todo', async () => {
    // Mock login
    const loginResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => loginResponse,
    });

    await api.login('tenant_acme', 'alice@acme.com', 'password123');

    // Mock delete todo
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
    });

    await api.deleteTodo('todo_01');

    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3000/api/todos/todo_01',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-jwt-token',
        }),
      })
    );
  });

  it('should handle unauthorized requests', async () => {
    // Try to get todos without logging in
    await expect(api.getTodos()).rejects.toThrow('Unauthorized');
  });

  it('should logout and clear session', async () => {
    // Mock login first
    const loginResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => loginResponse,
    });

    await api.login('tenant_acme', 'alice@acme.com', 'password123');
    expect(api.getSession()).not.toBeNull();

    await api.logout();
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem('chronos_session')).toBeNull();
  });

  it('should get and create categories', async () => {
    // Mock login
    const loginResponse = {
      tenant: { id: 'tenant_acme', name: 'Acme Corp', slug: 'acme' },
      user: {
        id: 'user_01',
        tenant_id: 'tenant_acme',
        username: 'Alice Acme',
        email: 'alice@acme.com',
        created_at: new Date().toISOString()
      },
      token: 'mock-jwt-token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => loginResponse,
    });

    await api.login('tenant_acme', 'alice@acme.com', 'password123');

    // Mock create category
    const mockCategory = {
      id: 'cat_01',
      user_id: 'user_01',
      tenant_id: 'tenant_acme',
      name: 'Work',
      color: '#3b82f6',
      created_at: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ category: mockCategory }),
    });

    const category = await api.createCategory('Work', '#3b82f6');

    expect(category.name).toBe('Work');
    expect(category.color).toBe('#3b82f6');
  });
});
