import { supabase } from '../supabase/client';
import type { 
  ExpenseCategory,
  Vendor,
  Expense,
  ExpenseApproval
} from '../supabase/types';

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

export async function createExpenseCategory(schoolId: string, data: {
  name: string;
  code: string;
  description?: string;
  parent_category_id?: string;
  monthly_budget?: number;
  annual_budget?: number;
  requires_approval?: boolean;
  approval_threshold?: number;
}) {
  const { data: category, error } = await supabase
    .from('expense_categories')
    .insert({
      school_id: schoolId,
      ...data,
      requires_approval: data.requires_approval ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return category as ExpenseCategory;
}

export async function getExpenseCategories(schoolId: string) {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as ExpenseCategory[];
}

export async function updateExpenseCategory(id: string, updates: Partial<ExpenseCategory>) {
  const { data, error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseCategory;
}

export async function deleteExpenseCategory(id: string) {
  const { error } = await supabase
    .from('expense_categories')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// VENDORS
// ============================================================================

export async function createVendor(schoolId: string, data: {
  name: string;
  vendor_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  kra_pin?: string;
  registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  is_preferred?: boolean;
  rating?: number;
  notes?: string;
}) {
  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      school_id: schoolId,
      ...data,
      is_preferred: data.is_preferred ?? false,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return vendor as Vendor;
}

export async function getVendors(schoolId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Vendor[];
}

export async function getVendorById(id: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(id: string, updates: Partial<Vendor>) {
  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function deleteVendor(id: string) {
  const { error } = await supabase
    .from('vendors')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function createExpense(schoolId: string, userId: string, data: {
  expense_number: string;
  title: string;
  description?: string;
  expense_date: string;
  category_id: string;
  vendor_id?: string;
  amount: number;
  currency?: string;
  payment_method?: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'credit';
  payment_reference?: string;
  payment_date?: string;
  receipt_url?: string;
  invoice_url?: string;
  attachments?: { url: string; name: string }[];
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_due_date?: string;
  notes?: string;
}) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      school_id: schoolId,
      submitted_by: userId,
      ...data,
      currency: data.currency || 'ZMW',
      is_recurring: data.is_recurring ?? false,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return expense as Expense;
}

export async function getExpenses(schoolId: string, filters?: {
  category_id?: string;
  vendor_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase
    .from('expenses')
    .select('*, expense_categories(*), vendors(*)')
    .eq('school_id', schoolId);

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.start_date) {
    query = query.gte('expense_date', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('expense_date', filters.end_date);
  }

  const { data, error } = query.order('expense_date', { ascending: false });

  if (error) throw error;
  return data as (Expense & { expense_categories: ExpenseCategory; vendors: Vendor | null })[];
}

export async function getExpenseById(id: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(*), vendors(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Expense & { expense_categories: ExpenseCategory; vendors: Vendor | null };
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function approveExpense(id: string, userId: string, comments?: string) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function rejectExpense(id: string, userId: string, reason: string) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function markExpenseAsPaid(id: string, paymentReference: string, paymentDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'paid',
      payment_reference: paymentReference,
      payment_date: paymentDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

// ============================================================================
// EXPENSE APPROVALS
// ============================================================================

export async function createExpenseApproval(schoolId: string, data: {
  expense_id: string;
  approver_id: string;
  approval_level: number;
}) {
  const { data: approval, error } = await supabase
    .from('expense_approvals')
    .insert({
      school_id: schoolId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return approval as ExpenseApproval;
}

export async function getExpenseApprovals(expenseId: string) {
  const { data, error } = await supabase
    .from('expense_approvals')
    .select('*')
    .eq('expense_id', expenseId)
    .order('approval_level', { ascending: true });

  if (error) throw error;
  return data as ExpenseApproval[];
}

export async function updateExpenseApproval(id: string, updates: {
  status: 'approved' | 'rejected';
  comments?: string;
}) {
  const { data, error } = await supabase
    .from('expense_approvals')
    .update({
      ...updates,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseApproval;
}

// ============================================================================
// EXPENSE REPORTS
// ============================================================================

export async function getExpenseSummary(schoolId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(*)')
    .eq('school_id', schoolId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .not('status', 'in', '("cancelled","rejected")');

  if (error) throw error;

  const totalExpenses = data.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = data.filter(e => e.status === 'approved' || e.status === 'paid');
  const pendingExpenses = data.filter(e => e.status === 'pending');

  const byCategory = data.reduce((acc, expense) => {
    const categoryName = expense.expense_categories?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = 0;
    }
    acc[categoryName] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    records: data,
    summary: {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalTransactions: data.length,
      approvedAmount: Math.round(approvedExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
      pendingAmount: Math.round(pendingExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
      byCategory: Object.entries(byCategory).map(([name, amount]) => ({
        category: name,
        amount: Math.round(amount * 100) / 100,
      })),
    },
  };
}

export async function getExpensesByCategory(schoolId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category_id, expense_categories(name)')
    .eq('school_id', schoolId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .not('status', 'in', '("cancelled","rejected")');

  if (error) throw error;

  const grouped = data.reduce((acc, expense) => {
    const categoryName = (expense.expense_categories as any)?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: categoryName,
        total: 0,
        count: 0,
      };
    }
    acc[categoryName].total += expense.amount;
    acc[categoryName].count += 1;
    return acc;
  }, {} as Record<string, { category: string; total: number; count: number }>);

  return Object.values(grouped).map(item => ({
    ...item,
    total: Math.round(item.total * 100) / 100,
  }));
}

export async function getMonthlyExpenseTrend(schoolId: string, year: number) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('school_id', schoolId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .not('status', 'in', '("cancelled","rejected")');

  if (error) throw error;

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
    total: 0,
    count: 0,
  }));

  data.forEach(expense => {
    const date = new Date(expense.expense_date);
    const month = date.getMonth();
    monthly[month].total += expense.amount;
    monthly[month].count += 1;
  });

  return monthly.map(item => ({
    ...item,
    total: Math.round(item.total * 100) / 100,
  }));
}

export async function getTopVendors(schoolId: string, startDate: string, endDate: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, vendor_id, vendors(name, vendor_type)')
    .eq('school_id', schoolId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .not('status', 'in', '("cancelled","rejected")')
    .not('vendor_id', 'is', null);

  if (error) throw error;

  const grouped = data.reduce((acc, expense) => {
    const vendorName = (expense.vendors as any)?.name || 'Unknown';
    if (!acc[vendorName]) {
      acc[vendorName] = {
        vendor_name: vendorName,
        vendor_type: (expense.vendors as any)?.vendor_type || 'unknown',
        total: 0,
        count: 0,
      };
    }
    acc[vendorName].total += expense.amount;
    acc[vendorName].count += 1;
    return acc;
  }, {} as Record<string, { vendor_name: string; vendor_type: string; total: number; count: number }>);

  return Object.values(grouped)
    .map(item => ({
      ...item,
      total: Math.round(item.total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}