import { Todo, Category, User, Tenant, AuthSession, CreateTodoDTO, UpdateTodoDTO } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const STORAGE_KEYS = {
  SESSION: 'chronos_session',
};

/**
 * API Error class for better error handling
 */
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Service for interacting with the Multi-Tenant Todo Backend
 * All localStorage mock data has been replaced with real HTTP API calls
 */
class ApiService {
  private session: AuthSession | null = null;

  constructor() {
    this.restoreSession();
  }

  /**
   * Restore session from localStorage on initialization
   */
  private restoreSession() {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (sessionStr) {
      try {
        this.session = JSON.parse(sessionStr);
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    }
  }

  /**
   * Generic fetch wrapper with error handling and JWT token injection
   */
  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if available
    if (this.session?.token) {
      headers['Authorization'] = `Bearer ${this.session.token}`;
      console.log('🔑 Auth token added to request');
    }

    try {
      console.log('📤 Request body:', options.body);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response data:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }
        throw new ApiError(response.status, errorMessage);
      }

      // Handle empty responses (e.g., DELETE)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('📭 Empty/non-JSON response');
        return {} as T;
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      return data;
    } catch (error) {
      console.error('💥 Fetch error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      // Network or other errors
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // --- AUTH METHODS ---

  /**
   * POST /api/tenant/lookup - Find tenant by name/slug
   */
  async checkTenant(slug: string): Promise<string> {
    const response = await this.fetchApi<{ tenantId: string }>('/api/tenant/lookup', {
      method: 'POST',
      body: JSON.stringify({ tenantName: slug }),
    });

    console.log('📥 API: Tenant lookup response:', response.tenantId);
    return response.tenantId;
  }

  /**
   * POST /api/tenant/create - Create new tenant (requires invite key)
   */
  async createWorkspace(
    tenantName: string,
    tenantSlug: string,
    email: string,
    username: string,
    inviteKey: string,
    password: string = 'password123' // Default password, should be passed from UI
  ): Promise<AuthSession> {
    const response = await this.fetchApi<{
      tenant: Tenant;
      user: User;
      token: string;
    }>('/api/tenant/create', {
      method: 'POST',
      body: JSON.stringify({
        name: tenantName,
        slug: tenantSlug,
        email,
        fullName: username,
        password,
        inviteKey,
      }),
    });

    const session: AuthSession = {
      user: response.user,
      tenant: response.tenant,
      token: response.token,
    };

    this.session = session;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

    return session;
  }

  /**
   * POST /api/user/login - User authentication
   */
  async login(tenantId: string, email: string, password: string = 'password123'): Promise<AuthSession> {
    console.log('🔐 Login attempt:', { tenantId, email, password: '***' });

    const requestBody = {
      tenantId,
      email,
      password,
    };
    console.log('📤 Login request payload:', requestBody);

    const response = await this.fetchApi<{
      user: User;
      tenant: Tenant;
      token: string;
    }>('/api/user/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Login response:', {
      user: response.user,
      tenant: response.tenant,
      token: response.token ? '***' + response.token.slice(-8) : 'none'
    });

    const session: AuthSession = {
      user: response.user,
      tenant: response.tenant,
      token: response.token,
    };

    this.session = session;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

    console.log('✅ Login successful, session stored');

    return session;
  }

  /**
   * Logout - Clear session
   */
  async logout(): Promise<void> {
    this.session = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  // --- DATA METHODS ---

  /**
   * Ensure user is authenticated
   */
  private getContext() {
    if (!this.session) throw new Error('Unauthorized');
    return this.session;
  }

  /**
   * GET /api/categories - List user's categories
   */
  async getCategories(): Promise<Category[]> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ categories: Category[] }>('/api/categories', {
      method: 'GET',
    });
    return response.categories;
  }

  /**
   * POST /api/categories - Create category
   */
  async createCategory(name: string, color: string, icon?: string): Promise<Category> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ category: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color, icon }),
    });
    return response.category;
  }

  /**
   * GET /api/categories/:id - Get single category
   */
  async getCategory(id: string): Promise<Category> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ category: Category }>(`/api/categories/${id}`, {
      method: 'GET',
    });
    return response.category;
  }

  /**
   * PUT /api/categories/:id - Update category
   */
  async updateCategory(id: string, name: string, color: string, icon?: string): Promise<Category> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ category: Category }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color, icon }),
    });
    return response.category;
  }

  /**
   * DELETE /api/categories/:id - Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    this.getContext(); // Ensure auth
    await this.fetchApi<void>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * GET /api/todos - List user's todos
   */
  async getTodos(): Promise<Todo[]> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ todos: Todo[] }>('/api/todos', {
      method: 'GET',
    });
    return response.todos;
  }

  /**
   * POST /api/todos - Create todo
   */
  async createTodo(dto: CreateTodoDTO): Promise<Todo> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ todo: Todo }>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.todo;
  }

  /**
   * GET /api/todos/:id - Get single todo
   */
  async getTodo(id: string): Promise<Todo> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ todo: Todo }>(`/api/todos/${id}`, {
      method: 'GET',
    });
    return response.todo;
  }

  /**
   * PUT /api/todos/:id - Update todo
   */
  async updateTodo(id: string, dto: UpdateTodoDTO): Promise<Todo> {
    this.getContext(); // Ensure auth
    const response = await this.fetchApi<{ todo: Todo }>(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return response.todo;
  }

  /**
   * DELETE /api/todos/:id - Delete todo (admin only)
   */
  async deleteTodo(id: string): Promise<void> {
    this.getContext(); // Ensure auth
    await this.fetchApi<void>(`/api/todos/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * GET /health - Health check endpoint
   */
  async healthCheck(): Promise<{ status: string }> {
    return await this.fetchApi<{ status: string }>('/health', {
      method: 'GET',
    });
  }
}

export const api = new ApiService();