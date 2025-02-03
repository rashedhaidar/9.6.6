import React, { useState, useCallback, useMemo } from 'react';
    import { Plus, Trash2, Edit2, Check, Target, Calendar } from 'lucide-react';
    import { Activity } from '../types/activity';
    import { LIFE_DOMAINS } from '../types/domains';
    import { useWeekSelection } from '../hooks/useWeekSelection';
    import { ActivityContext } from '../context/ActivityContext';
    import { makeLinksClickable } from '../utils/linkUtils';
    import { formatDate } from '../utils/dateUtils';

    interface GoalsProps {
      activities: Activity[];
    }

    interface Goal {
      id: string;
      domainId: string;
      title: string;
      description?: string;
      targetCount?: number;
      createdAt: string;
      dueDate?: string;
      completed?: boolean;
    }

    export function Goals({ activities }: GoalsProps) {
      const { weekNumber, year } = useWeekSelection();
      const { addActivity, updateActivity, deleteActivity } = React.useContext(ActivityContext);
      const [goals, setGoals] = useState<Goal[]>(() => {
        const saved = localStorage.getItem('goals');
        return saved ? JSON.parse(saved) : [];
      });
      const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
      const [newGoal, setNewGoal] = useState<Omit<Goal, 'id' | 'createdAt' | 'completed'>>({
        domainId: 'personal',
        title: '',
        description: '',
        targetCount: undefined,
        dueDate: '',
      });
      const [selectedDomainFilter, setSelectedDomainFilter] = useState<string | null>(null);

      React.useEffect(() => {
        localStorage.setItem('goals', JSON.stringify(goals));
      }, [goals]);

      const handleAddGoal = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.title) return;

        const goal: Goal = {
          id: crypto.randomUUID(),
          ...newGoal,
          createdAt: new Date().toISOString(),
          completed: false,
        };
        setGoals(prev => [...prev, goal]);
        setNewGoal({ domainId: 'personal', title: '', description: '', targetCount: undefined, dueDate: '' });
      }, [newGoal]);

      const handleEditGoal = useCallback((goal: Goal) => {
        setEditingGoal(goal);
        setNewGoal(goal);
      }, []);

      const handleUpdateGoal = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGoal) return;

        setGoals(prev =>
          prev.map(goal =>
            goal.id === editingGoal.id ? { ...newGoal, id: editingGoal.id, createdAt: editingGoal.createdAt, completed: editingGoal.completed } : goal
          )
        );
        setEditingGoal(null);
        setNewGoal({ domainId: 'personal', title: '', description: '', targetCount: undefined, dueDate: '' });
      }, [editingGoal, newGoal]);

      const handleDeleteGoal = useCallback((id: string) => {
        setGoals(prev => prev.filter(goal => goal.id !== id));
      }, []);

      const handleGoalSelect = useCallback((goal: Goal) => {
        if (editingGoal) {
          setNewGoal(prev => ({ ...prev, domainId: goal.domainId }));
        }
      }, [editingGoal, setNewGoal]);

      const handleActivitySelect = useCallback((activity: Activity, goal: Goal) => {
        updateActivity(activity.id, { goalId: goal.id });
      }, [updateActivity]);

      const calculateGoalProgress = useCallback((goal: Goal) => {
        const goalActivities = activities.filter(activity => activity.goalId === goal.id);
        if (goalActivities.length === 0) return { completed: 0, total: 0, percentage: 0 };

        let totalCount = 0;
        let completedCount = 0;

        goalActivities.forEach(activity => {
          totalCount += activity.selectedDays.length;
          completedCount += activity.selectedDays.filter(dayIndex => activity.completedDays && activity.completedDays[dayIndex]).length;
        });

        return {
          completed: completedCount,
          total: totalCount,
          percentage: Math.round((completedCount / totalCount) * 100),
        };
      }, [activities]);

      const inputClasses = "w-full p-2 border rounded-md bg-black/20 text-white border-amber-400/30 placeholder-white/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none";

      const filteredGoals = useMemo(() => {
        if (!selectedDomainFilter) return goals;
        return goals.filter(goal => goal.domainId === selectedDomainFilter);
      }, [goals, selectedDomainFilter]);

      const handleToggleCompleted = useCallback((goal: Goal) => {
        setGoals(prev =>
          prev.map(g =>
            g.id === goal.id ? { ...g, completed: !g.completed } : g
          )
        );
      }, [setGoals]);

      const domainColors = useMemo(() => ({
        'professional': 'rgba(245,245,220,0.1)',
        'educational': 'rgba(255,255,0,0.1)',
        'health': 'rgba(144,238,144,0.1)',
        'family': 'rgba(255,0,0,0.1)',
        'social': 'rgba(210,180,140,0.1)',
        'financial': 'rgba(0,100,0,0.1)',
        'personal': 'rgba(0,0,255,0.1)',
        'spiritual': 'rgba(64,224,208,0.1)',
      }), []);

      return (
        <div className="space-y-6">
          <div className="bg-black/20 p-6 rounded-lg">
            <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={newGoal.domainId}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, domainId: e.target.value }))}
                  className={inputClasses}
                >
                  {LIFE_DOMAINS.map(domain => (
                    <option key={domain.id} value={domain.id}>{domain.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="اسم الهدف"
                  className={inputClasses}
                  dir="rtl"
                />
              </div>
              <textarea
                value={newGoal.description || ''}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف الهدف"
                className={inputClasses}
                dir="rtl"
              />
              <input
                type="number"
                value={newGoal.targetCount || ''}
                onChange={(e) => setNewGoal(prev => ({ ...prev, targetCount: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="العدد المستهدف"
                className={inputClasses}
                dir="rtl"
              />
              <input
                type="date"
                value={newGoal.dueDate || ''}
                onChange={(e) => setNewGoal(prev => ({ ...prev, dueDate: e.target.value }))}
                className={inputClasses}
                dir="rtl"
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black p-2 rounded-md hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
              >
                {editingGoal ? 'تعديل الهدف' : 'إضافة هدف'}
                {editingGoal ? <Edit2 size={20} /> : <Plus size={20} />}
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between mb-4">
            <select
              value={selectedDomainFilter || 'all'}
              onChange={(e) => setSelectedDomainFilter(e.target.value === 'all' ? null : e.target.value)}
              className="bg-black/20 text-white rounded-lg px-3 py-1 border border-white/10 focus:border-white focus:ring-1 focus:ring-white text-sm md:text-base"
              dir="rtl"
            >
              <option value="all">جميع المجالات</option>
              {LIFE_DOMAINS.map(domain => (
                <option key={domain.id} value={domain.id}>{domain.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            {filteredGoals.map(goal => {
              const domain = LIFE_DOMAINS.find(d => d.id === goal.domainId);
              const progress = calculateGoalProgress(goal);
              const isExpired = goal.dueDate && new Date(goal.dueDate) < new Date();
              return (
                <div key={goal.id} className={`p-4 rounded-lg`} style={{ backgroundColor: domainColors[goal.domainId] || 'transparent' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {domain?.icon && <domain.icon size={20} className="text-white" />}
                      <h3 className="text-xl font-medium text-white">{goal.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpired && !goal.completed && <span className="text-red-400 text-xs ml-1"> (انتهت المدة)</span>}
                      {goal.completed && <span className="text-green-400 text-xs ml-1"> (مكتمل)</span>}
                      <button
                        onClick={() => handleToggleCompleted(goal)}
                        className={`p-1 rounded-full ${
                          goal.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-red-400/70 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="text-amber-400/70 hover:text-amber-400 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-2" dangerouslySetInnerHTML={{ __html: makeLinksClickable(goal.description || '') }} />
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">
                      {goal.dueDate && <span>تاريخ الاستحقاق: {formatDate(new Date(goal.dueDate))}</span >}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-medium text-white">{progress.percentage}%</span>
                      <span className="text-xs text-white/70">({progress.completed}/{progress.total})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
