import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TodoItem from './TodoItem';
import { Todo } from '../types';

describe('TodoItem Component', () => {
  const mockTodo: Todo = {
    id: '123',
    title: 'Buy Milk',
    description: '2% Organic',
    is_completed: false,
    created_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    completed_at: null,
    updated_at: new Date().toISOString(),
    user_id: 'u1',
    tenant_id: 't1',
    category_id: null,
    priority: 'medium'
  };

  const mockHandlers = {
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
  };

  it('renders todo details correctly', () => {
    render(<TodoItem todo={mockTodo} {...mockHandlers} />);
    
    expect(screen.getByText('Buy Milk')).toBeInTheDocument();
    expect(screen.getByText(/2% Organic/)).toBeInTheDocument(); // Description might be truncated
  });

  it('calls onToggle when checkbox is clicked', () => {
    render(<TodoItem todo={mockTodo} {...mockHandlers} />);
    
    // The checkbox button is the first button
    const buttons = screen.getAllByRole('button');
    const checkbox = buttons[0]; 
    
    fireEvent.click(checkbox);
    expect(mockHandlers.onToggle).toHaveBeenCalledWith('123', false);
  });

  it('renders completed state correctly', () => {
    const completedTodo = { ...mockTodo, is_completed: true };
    render(<TodoItem todo={completedTodo} {...mockHandlers} />);
    
    const title = screen.getByText('Buy Milk');
    expect(title).toHaveClass('line-through');
  });

  it('calls onView when clicked', () => {
    render(<TodoItem todo={mockTodo} {...mockHandlers} />);
    
    const item = screen.getByText('Buy Milk').closest('div')?.parentElement;
    if (item) fireEvent.click(item);
    
    expect(mockHandlers.onView).toHaveBeenCalledWith(mockTodo);
  });
});
