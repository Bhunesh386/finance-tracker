import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, AlertTriangle, Edit2, Check, X } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState({});
  const [loading, setLoading] = useState(true);

  // Selector State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editLimit, setEditLimit] = useState('');

  useEffect(() => {
    if (user) {
      fetchBudgetsAndSpending();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchBudgetsAndSpending = async () => {
    setLoading(true);
    try {
      // Fetch Budgets for selected month/year
      const { data: bData, error: bError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (bError) throw bError;
      setBudgets(bData || []);

      // Fetch Expenses for selected month/year to calculate spending
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

      const { data: tData, error: tError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (tError) throw tError;

      // Group spending by category
      const spent = {};
      (tData || []).forEach(tx => {
        spent[tx.category] = (spent[tx.category] || 0) + Number(tx.amount);
      });
      setSpending(spent);
      
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!limit || Number(limit) <= 0) return;

    setIsSubmitting(true);
    try {
      // Check if budget already exists for this category/month/year
      const exists = budgets.find(b => b.category === category);
      if (exists) {
        alert('Budget already exists for this category in the selected month.');
        return;
      }

      const { error } = await supabase.from('budgets').insert([{
        user_id: user.id,
        category,
        monthly_limit: Number(limit),
        month: selectedMonth,
        year: selectedYear
      }]);

      if (error) throw error;
      setLimit('');
      await fetchBudgetsAndSpending();
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to save budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget limit?')) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const startEdit = (budget) => {
    setEditingId(budget.id);
    setEditLimit(budget.monthly_limit);
  };

  const saveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ monthly_limit: Number(editLimit) })
        .eq('id', id);
        
      if (error) throw error;
      setEditingId(null);
      await fetchBudgetsAndSpending();
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLimit('');
  };

  const availableCategories = CATEGORIES.filter(c => !budgets.find(b => b.category === c));

  // Months array for select
  const months = Array.from({ length: 12 }, (_, i) => {
    return new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
  });

  const getWarningLevel = (spent, limitAmt) => {
    const pct = (spent / limitAmt) * 100;
    if (pct >= 100) return 'danger';
    if (pct >= 80) return 'warning';
    return 'safe';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl heading-text font-bold">Budgets</h2>
        
        {/* Period Selector */}
        <div className="flex space-x-2 bg-surface p-1.5 rounded-lg border border-subtle">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none focus:outline-none text-sm font-medium text-main"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none focus:outline-none text-sm font-medium text-main"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Budget Form */}
      <div className="bg-surface p-6 rounded-xl border border-subtle">
        <h3 className="text-lg heading-text font-semibold mb-4">Set Budget Limit</h3>
        <form onSubmit={handleCreateBudget} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-muted mb-1">Category</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main"
            >
              {availableCategories.length > 0 ? (
                availableCategories.map(c => <option key={c} value={c}>{c}</option>)
              ) : (
                <option value="" disabled>All categories have budgets</option>
              )}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-muted mb-1">Monthly Limit (₹)</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              disabled={availableCategories.length === 0}
              className="w-full px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main"
              placeholder="5000"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || availableCategories.length === 0}
            className="w-full sm:w-auto bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 font-medium h-[42px]"
          >
            Save Budget
          </button>
        </form>
      </div>

      {/* Budgets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[200px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted animate-pulse">
            Loading budgets...
          </div>
        ) : budgets.length > 0 ? (
          budgets.map(b => {
            const spent = spending[b.category] || 0;
            const limitAmt = Number(b.monthly_limit);
            const status = getWarningLevel(spent, limitAmt);
            const isEditing = editingId === b.id;
            const pct = Math.min((spent / limitAmt) * 100, 100);

            return (
              <div key={b.id} className="bg-surface p-6 rounded-xl border border-subtle flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-main text-lg">{b.category}</h4>
                    {status === 'danger' && <AlertTriangle size={16} className="text-red-500" title="Over budget!" />}
                    {status === 'warning' && <AlertTriangle size={16} className="text-orange-500" title="Nearing limit" />}
                  </div>
                  <div className="flex space-x-1">
                    {!isEditing && (
                      <>
                        <button onClick={() => startEdit(b)} className="p-1.5 text-muted hover:bg-subtle hover:text-main rounded-md transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="number"
                      value={editLimit}
                      onChange={e => setEditLimit(e.target.value)}
                      className="w-full px-2 py-1 bg-main border border-accent rounded focus:outline-none"
                    />
                    <button onClick={() => saveEdit(b.id)} className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"><Check size={16}/></button>
                    <button onClick={cancelEdit} className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted">Spent</span>
                      <span className="font-bold text-main">{formatCurrency(spent)} <span className="text-muted font-normal text-xs">/ {formatCurrency(limitAmt)}</span></span>
                    </div>
                  </div>
                )}

                <div className="h-2 w-full bg-subtle rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                
                <div className="min-h-[20px] text-xs text-right mt-auto">
                  {status === 'danger' && <span className="text-red-500 font-medium">Over limit by {formatCurrency(spent - limitAmt)}</span>}
                  {status === 'warning' && <span className="text-orange-500 font-medium">Approaching limit. {formatCurrency(limitAmt - spent)} remaining.</span>}
                  {status === 'safe' && <span className="text-green-500 font-medium">{formatCurrency(limitAmt - spent)} remaining</span>}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted">
            <p>No budgets configured for this month.</p>
            <p className="text-sm">Set a limit above to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
