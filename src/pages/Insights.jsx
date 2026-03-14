import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { generateInsights } from '../lib/openrouter';
import { Sparkles, AlertTriangle, Lightbulb, CheckCircle2, Loader2 } from 'lucide-react';

export default function Insights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch last 60 days of user's transactions
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('date, amount, type, category, description')
        .eq('user_id', user.id)
        .gte('date', sixtyDaysAgo.toISOString())
        .order('date', { ascending: false });

      if (txError) throw txError;

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions found in the last 60 days to analyze. Please add some transactions first.');
      }

      const generatedData = await generateInsights(transactions);
      
      // Ensure it's an array
      if (!Array.isArray(generatedData)) {
        throw new Error('Received malformed insights from AI. Please try again.');
      }

      setInsights(generatedData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const InsightIcon = ({ type }) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-orange-500" size={24} />;
      case 'tip': return <Lightbulb className="text-blue-500" size={24} />;
      case 'positive': return <CheckCircle2 className="text-green-500" size={24} />;
      default: return <Sparkles className="text-accent" size={24} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'warning': return 'border-orange-500/50';
      case 'tip': return 'border-blue-500/50';
      case 'positive': return 'border-green-500/50';
      default: return 'border-subtle';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 text-accent mb-4">
          <Sparkles size={32} />
        </div>
        <h2 className="text-3xl heading-text font-bold mb-3">AI Financial Advisor</h2>
        <p className="text-muted max-w-xl mx-auto mb-8">
          Get personalized, actionable insights based on your spending patterns over the last 60 days. Powered by Google Gemma 3.
        </p>
        
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center space-x-2 bg-accent text-white px-6 py-3 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-70 font-medium text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          <span>{loading ? 'Analyzing Data...' : 'Generate New Insights'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {insights.map((insight, idx) => (
            <div 
              key={idx} 
              className={`bg-surface p-6 rounded-xl border ${getBorderColor(insight.type)} flex gap-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex-shrink-0 mt-1">
                <InsightIcon type={insight.type} />
              </div>
              <div>
                <h3 className="text-lg heading-text font-semibold mb-1 text-main">{insight.title}</h3>
                <p className="text-main leading-relaxed">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
