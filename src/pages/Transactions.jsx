import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Plus, Download, Trash2, Search, Filter } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

const CATEGORY_COLORS = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Shopping: '#ec4899',
  Bills: '#ef4444',
  Entertainment: '#a855f7',
  Health: '#22c55e',
  Other: '#6b7280',
};

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: user.id,
          amount: Number(amount),
          type,
          category,
          description,
          date,
        },
      ]);

      if (error) throw error;

      // Reset form & update list
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      await fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      return matchType && matchCategory;
    });
  }, [transactions, filterType, filterCategory]);

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (₹)'];
    const rows = filteredTransactions.map(t => [t.date, t.type, t.category, `"${t.description.replace(/"/g, '""')}"`, t.amount]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl heading-text font-bold">Transactions</h2>
        <button
          onClick={exportCSV}
          className="flex items-center space-x-2 bg-surface border border-subtle hover:bg-subtle text-main px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Add Transaction Form */}
      <div className="bg-surface p-6 rounded-xl border border-subtle">
        <h3 className="text-lg heading-text font-semibold mb-4">Add New Transaction</h3>
        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-subtle">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-surface text-muted hover:bg-subtle'}`}
                onClick={() => setType('expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-subtle ${type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-surface text-muted hover:bg-subtle'}`}
                onClick={() => setType('income')}
              >
                Income
              </button>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main text-sm"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main text-sm"
              placeholder="0.00"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main text-sm appearance-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1">Description</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 px-3 py-2 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-main text-sm"
                placeholder="What was this for?"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Transaction List */}
      <div className="bg-surface rounded-xl border border-subtle overflow-hidden flex flex-col">
        <div className="p-4 border-b border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface/50">
          <div className="flex items-center space-x-2 text-main font-medium">
            <Filter size={18} className="text-muted" />
            <span>Filters</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 sm:w-32 px-3 py-1.5 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-accent text-sm"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 sm:w-40 px-3 py-1.5 bg-main border border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-accent text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted animate-pulse">Loading transactions...</div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-main/50 text-muted text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-main/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-main">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full text-white shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other }}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-main">{tx.description}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted">
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-main rounded-full flex items-center justify-center text-muted mb-4">
              <Search size={24} />
            </div>
            <p className="text-main font-medium">No transactions found</p>
            <p className="text-sm text-muted mt-1">Try adjusting your filters or add a new transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
