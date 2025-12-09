/**
 * Global Type Definitions
 * Designed to reflect a standard SQL Relational Schema.
 */

export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string; // unique URL friendly identifier (e.g., 'acme')
  logo_url?: string;
}

// Mirrors a 'users' table
export interface User {
  id: string; // UUID
  tenant_id: string; // Foreign Key -> tenants.id
  username: string;
  email: string;
  created_at: string; // ISO 8601
  avatar_url?: string;
}

// Mirrors a 'categories' table
export interface Category {
  id: string; // UUID
  user_id: string; // Foreign Key -> users.id
  tenant_id: string; // Foreign Key -> tenants.id
  name: string;
  color: string; // Hex code
  icon?: string; // Icon name
  created_at: string;
}

// Mirrors a 'todos' table
export interface Todo {
  id: string; // UUID
  user_id: string; // Foreign Key -> users.id
  tenant_id: string; // Foreign Key -> tenants.id
  category_id: string | null; // Foreign Key -> categories.id (Nullable)
  title: string;
  description?: string;
  is_completed: boolean;
  due_date: string | null; // ISO 8601 Date String
  completed_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  priority: 'low' | 'medium' | 'high';
}

export type CreateTodoDTO = Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'user_id' | 'tenant_id'>;
export type UpdateTodoDTO = Partial<Omit<Todo, 'id' | 'user_id' | 'tenant_id' | 'created_at'>>;

// Filter/View State Types
export enum ViewType {
  TODAY = 'TODAY',
  UPCOMING = 'UPCOMING',
  COMPLETED = 'COMPLETED',
  CATEGORY = 'CATEGORY',
  ALL = 'ALL'
}

export interface AuthSession {
  user: User;
  tenant: Tenant;
  token: string;
}
