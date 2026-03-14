import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: '#f97316',        // orange
  Transport: '#3b82f6',   // blue
  Shopping: '#ec4899',    // pink
  Bills: '#ef4444',       // red
  Entertainment: '#a855f7', // purple
  Health: '#22c55e',      // green
  Other: '#6b7280',       // gray
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    income: 0,
    expenses: 0,
    net: 0,
    count: 0,
    recentTransactions: [],
    monthlySpending: [],
    categoryBreakdown: [],
    budgets: []
  });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      // Fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sixMonthsAgo)
        .order('date', { ascending: false });

      if (txError) throw txError;

      // Fetch budgets for current month
      const { data: budgets, error: bgError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());

      if (bgError) throw bgError;

      processData(transactions || [], budgets || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (transactions, budgets) => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM

    let income = 0;
    let expenses = 0;
    let count = 0;
    const categoryTotals = {};
    const monthlyTotals = {};

    // Initialize last 6 months for chart
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      monthlyTotals[monthStr] = { name: monthLabel, amount: 0 };
    }

    transactions.forEach(tx => {
      const txMonth = tx.date.slice(0, 7);
      const amount = Number(tx.amount);

      // Current month stats
      if (txMonth === currentMonthPrefix) {
        count++;
        if (tx.type === 'income') {
          income += amount;
        } else {
          expenses += amount;
          // Category breakdown
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
        }
      }

      // Monthly spending charting (expenses only)
      if (tx.type === 'expense' && monthlyTotals[txMonth]) {
        monthlyTotals[txMonth].amount += amount;
      }
    });

    // Format chart data
    const monthlySpending = Object.values(monthlyTotals);
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Merge budgets with spending
    const budgetStatus = budgets.map(b => {
      const spent = categoryTotals[b.category] || 0;
      const limit = Number(b.monthly_limit);
      const pct = (spent / limit) * 100;
      let status = 'safe';
      if (pct >= 100) status = 'danger';
      else if (pct >= 80) status = 'warning';
      
      return { ...b, spent, limit, pct, status };
    });

    setData({
      income,
      expenses,
      net: income - expenses,
      count,
      recentTransactions: transactions.slice(0, 5),
      monthlySpending,
      categoryBreakdown,
      budgets: budgetStatus
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-subtle rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-subtle rounded-xl"></div>
          <div className="h-80 bg-subtle rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl heading-text font-bold mb-6">Dashboard Overview</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Income" 
          amount={data.income} 
          icon={<ArrowUpRight className="text-green-500" />} 
          trend="This month"
        />
        <SummaryCard 
          title="Total Expenses" 
          amount={data.expenses} 
          icon={<ArrowDownRight className="text-red-500" />} 
          trend="This month"
        />
        <SummaryCard 
          title="Net Balance" 
          amount={data.net} 
          icon={<Wallet className="text-accent" />} 
          trend="This month"
        />
        <SummaryCard 
          title="Transactions" 
          amount={data.count} 
          icon={<Activity className="text-blue-500" />} 
          trend="This month"
          isCount
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <div className="bg-surface p-6 rounded-xl border border-subtle">
          <h3 className="text-lg heading-text font-semibold mb-6">6-Month Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlySpending}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: 'var(--theme-bg-surface)', borderColor: 'var(--theme-border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-surface p-6 rounded-xl border border-subtle">
          <h3 className="text-lg heading-text font-semibold mb-6">Expenses by Category</h3>
          {data.categoryBreakdown.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS.Other} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--theme-bg-surface)', borderColor: 'var(--theme-border-color)', borderRadius: '8px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted">
              No expenses this month
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-surface p-6 rounded-xl border border-subtle">
          <h3 className="text-lg heading-text font-semibold mb-4">Recent Transactions</h3>
          {data.recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {data.recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between pb-4 border-b border-subtle last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:block">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other }}>
                        {tx.category}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-main">{tx.description}</p>
                      <p className="text-xs text-muted">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">No recent transactions</div>
          )}
        </div>

        {/* Budget Status */}
        <div className="bg-surface p-6 rounded-xl border border-subtle">
          <h3 className="text-lg heading-text font-semibold mb-4">Budget Status</h3>
          {data.budgets.length > 0 ? (
            <div className="space-y-5">
              {data.budgets.map(b => (
                <div key={b.id}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-main">{b.category}</span>
                      {b.status === 'danger' && <AlertTriangle size={14} className="text-red-500" />}
                      {b.status === 'warning' && <AlertTriangle size={14} className="text-orange-500" />}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-main">{formatCurrency(b.spent)}</span>
                      <span className="text-muted"> / {formatCurrency(b.limit)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-subtle rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.status === 'danger' ? 'bg-red-500' : b.status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">No budgets set for this month</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, amount, icon, trend, isCount }) {
  return (
    <div className="bg-surface p-6 rounded-xl border border-subtle flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted">{title}</h3>
        <div className="p-2 bg-main rounded-lg">{icon}</div>
      </div>
      <div>
        <h2 className="text-2xl heading-text font-bold mb-1">
          {isCount ? amount : formatCurrency(amount)}
        </h2>
        <p className="text-xs text-muted">{trend}</p>
      </div>
    </div>
  );
}
