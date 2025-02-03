import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react';
    import { Activity } from '../types/activity';
    import { LIFE_DOMAINS } from '../types/domains';
    import { useWeekSelection } from '../hooks/useWeekSelection';
    import { DAYS } from '../constants/days';
    import { CheckCircle, XCircle, Brain, TrendingUp, Award, Calendar, Download, Upload, Check, X, AlertTriangle, FileDown, FileUp, Eye, EyeOff, Plus, BookOpen, MessageSquare, Lightbulb, Sparkles } from 'lucide-react';
    import { ProgressView } from './ProgressView';
    import { WeekSelector } from './WeekSelector';
    import { ActivityContext } from '../context/ActivityContext';
    import { formatDate, getCurrentWeekDates, getDateOfWeek, getTotalWeeks } from '../utils/dateUtils';
    import { makeLinksClickable } from '../utils/linkUtils';
    import { AIInsights } from './AIInsights';

    interface EvaluationProps {
      activities: Activity[];
    }

    export function Evaluation({ activities }: EvaluationProps) {
      const weekSelection = useWeekSelection();
      const { selectedDate, weekNumber, year, changeWeek } = weekSelection;
      const fileInputRef = useRef<HTMLInputElement>(null);
      const { addActivity, updateActivity, deleteActivity } = useContext(ActivityContext);
      const currentWeekActivities = useMemo(() => activities.filter(activity => activity.weekNumber === weekNumber && activity.year === year), [activities, weekNumber, year]);
      const [showDomains, setShowDomains] = useState(true);
      const [achievements, setAchievements] = useState<string[]>(() => {
        const savedAchievements = localStorage.getItem(`achievements-${weekNumber}-${year}`);
        return savedAchievements ? JSON.parse(savedAchievements) : [];
      });
      const [transactions, setTransactions] = useState<any[]>(() => {
        const saved = localStorage.getItem('financialTransactions');
        return saved ? JSON.parse(saved) : [];
      });
      const [showMonthView, setShowMonthView] = useState(false);
      const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
      const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
      const [dropdownOpen, setDropdownOpen] = useState(false);

      const weekStartDate = useMemo(() => getDateOfWeek(weekNumber, year), [weekNumber, year]);
      const weekDates = useMemo(() => getCurrentWeekDates(weekStartDate), [weekStartDate]);

      useEffect(() => {
        const savedAchievements = localStorage.getItem(`achievements-${weekNumber}-${year}`);
        if (savedAchievements) {
          try {
            setAchievements(JSON.parse(savedAchievements));
          } catch (e) {
            console.error("Error parsing achievements:", savedAchievements, e);
            setAchievements([]);
          }
        } else {
          setAchievements([]);
        }
      }, [weekNumber, year]);

      const calculateDomainProgress = useCallback((domainId: string, activitiesToUse: Activity[]) => {
        const domainActivities = activitiesToUse.filter(a => a.domainId === domainId);
        if (domainActivities.length === 0) return { completed: 0, total: 0, percentage: 0 };

        let totalCount = 0;
        let completedCount = 0;

        domainActivities.forEach(activity => {
          totalCount += activity.selectedDays.length;
          completedCount += activity.selectedDays.filter(dayIndex => activity.completedDays && activity.completedDays[dayIndex]).length;
        });

        return {
          completed: completedCount,
          total: totalCount,
          percentage: Math.round((completedCount / totalCount) * 100),
        };
      }, []);

      const overallCompletionRate = useCallback((activitiesToUse: Activity[]) => {
        let totalCount = 0;
        const totalActivities = activitiesToUse.reduce((acc, activity) => acc + activity.selectedDays.length, 0);
        if (totalActivities === 0) return {completed: 0, total: 0, percentage: 0};

        let completedCount = 0;
        activitiesToUse.forEach(activity => {
          completedCount += activity.selectedDays.filter(dayIndex => activity.completedDays && activity.completedDays[dayIndex]).length;
        });
        return {
          completed: completedCount,
          total: totalActivities,
          percentage: Math.round((completedCount / totalActivities) * 100),
        };
      }, []);

      const overallRate = useMemo(() => overallCompletionRate(currentWeekActivities), [overallCompletionRate, currentWeekActivities]);

      const handleExport = useCallback((format: 'text' | 'json') => {
        const allData = {
          activities: activities,
          goals: JSON.parse(localStorage.getItem('goals') || '[]'),
          achievements: {},
          transactions: transactions,
          freeWriting: {},
          decisions: {},
          positiveNotes: {},
        };
      
        const currentYear = new Date().getFullYear();
        const totalWeeks = getTotalWeeks(currentYear);
      
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
          for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
            const weekKey = `${weekNumber}-${year}`;
            allData.achievements[weekKey] = localStorage.getItem(`achievements-${weekNumber}-${year}`) ? JSON.parse(localStorage.getItem(`achievements-${weekNumber}-${year}`)!) : [];
      
            const weekStartDate = getDateOfWeek(weekNumber, year);
            const weekDates = getCurrentWeekDates(weekStartDate);
            weekDates.forEach((date) => {
              const dateKey = formatDate(date);
              allData.freeWriting[dateKey] = localStorage.getItem(`freeWriting-${dateKey}`) || '';
              allData.decisions[dateKey] = localStorage.getItem(`decisions-${dateKey}`) || '';
              allData.positiveNotes[dateKey] = localStorage.getItem(`positiveNotes-${dateKey}`) ? JSON.parse(localStorage.getItem(`positiveNotes-${dateKey}`)!) : [];
            });
          }
        }
      
        const dataStr = format === 'json' ? JSON.stringify(allData, null, 2) : JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all_data.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, [activities, transactions]);

      const handleImport = useCallback((format: 'text' | 'json') => {
        fileInputRef.current?.click();
        fileInputRef.current?.setAttribute('accept', format === 'json' ? 'application/json' : 'text/plain');
      }, []);

      const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const fileContent = event.target?.result as string;
            const importedData = JSON.parse(fileContent);
      
            if (importedData) {
              if (importedData.activities) {
                // Clear existing activities
                activities.forEach(activity => deleteActivity(activity.id));
                // Import new activities
                importedData.activities.forEach(activity => {
                  const { id, ...rest } = activity;
                  addActivity(rest);
                });
              }
      
              if (importedData.goals) {
                localStorage.setItem('goals', JSON.stringify(importedData.goals));
              }
      
              if (importedData.achievements) {
                for (const weekKey in importedData.achievements) {
                  localStorage.setItem(`achievements-${weekKey}`, JSON.stringify(importedData.achievements[weekKey]));
                }
              }
      
              if (importedData.transactions) {
                localStorage.setItem('financialTransactions', JSON.stringify(importedData.transactions));
                setTransactions(importedData.transactions);
              }
      
              if (importedData.freeWriting) {
                for (const dateKey in importedData.freeWriting) {
                  localStorage.setItem(`freeWriting-${dateKey}`, importedData.freeWriting[dateKey]);
                }
              }
      
              if (importedData.decisions) {
                for (const dateKey in importedData.decisions) {
                  localStorage.setItem(`decisions-${dateKey}`, importedData.decisions[dateKey]);
                }
              }
      
              if (importedData.positiveNotes) {
                for (const dateKey in importedData.positiveNotes) {
                  localStorage.setItem(`positiveNotes-${dateKey}`, JSON.stringify(importedData.positiveNotes[dateKey]));
                }
              }
      
              alert('Data imported successfully!');
              window.location.reload();
            } else {
              alert('Invalid data format. Please ensure the file contains an object with "activities", "goals", "achievements", "transactions", "freeWriting", "decisions", and "positiveNotes".');
            }
          } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error parsing file. Please ensure it is a valid text file.');
          }
        };
        reader.readAsText(file);
      }, [activities, addActivity, deleteActivity, weekDates, setTransactions]);

      const toggleDomains = useCallback(() => {
        setShowDomains(!showDomains);
      }, [showDomains]);

      const handleAddAchievement = useCallback(() => {
        setAchievements([...achievements, '']);
      }, [achievements, setAchievements]);

      const handleRemoveAchievement = useCallback((index: number) => {
        const newAchievements = [...achievements];
        newAchievements.splice(index, 1);
        setAchievements(newAchievements);
        localStorage.setItem(`achievements-${weekNumber}-${year}`, JSON.stringify(newAchievements));
      }, [achievements, setAchievements, weekNumber, year]);

      const handleAchievementChange = useCallback((index: number, value: string) => {
        const newAchievements = [...achievements];
        newAchievements[index] = value;
        setAchievements(newAchievements);
        localStorage.setItem(`achievements-${weekNumber}-${year}`, JSON.stringify(newAchievements));
      }, [achievements, setAchievements, weekNumber, year]);

      const domainColors = useMemo(() => ({
        'professional': 'text-amber-100',
        'educational': 'text-amber-300',
        'health': 'text-green-400',
        'family': 'text-red-400',
        'social': 'text-orange-400',
        'financial': 'text-green-700',
        'personal': 'text-sky-400',
        'spiritual': 'text-teal-400',
      }), []);

      const allPositiveNotes = useMemo(() => {
        const dates = showMonthView ? Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => new Date(selectedYear, selectedMonth, i + 1)) : weekDates;
        return dates.reduce((acc, date) => {
          const prevDate = new Date(date);
          prevDate.setDate(date.getDate() + 2);
          const dateKey = prevDate.toISOString().split('T')[0];
          const notes = localStorage.getItem(`positiveNotes-${dateKey}`);
          if (notes) {
            try {
              const parsedNotes = JSON.parse(notes);
              acc.push({ date: prevDate, notes: parsedNotes.filter(Boolean) });
            } catch (e) {
              console.error("Error parsing positive notes:", notes, e);
            }
          }
          return acc;
        }, [] as { date: Date, notes: string[] }[]);
      }, [selectedMonth, selectedYear, showMonthView, weekDates]);

      const allFreeWriting = useMemo(() => {
        const dates = showMonthView ? Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => new Date(selectedYear, selectedMonth, i + 1)) : weekDates;
        return dates.reduce((acc, date) => {
          const prevDate = new Date(date);
          prevDate.setDate(date.getDate() + 2);
          const dateKey = prevDate.toISOString().split('T')[0];
          const writing = localStorage.getItem(`freeWriting-${dateKey}`);
          if (writing) {
            acc.push({ date: prevDate, text: writing });
          }
          return acc;
        }, [] as { date: Date, text: string }[]);
      }, [selectedMonth, selectedYear, showMonthView, weekDates]);

      const allDecisions = useMemo(() => {
        const dates = showMonthView ? Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => new Date(selectedYear, selectedMonth, i + 1)) : weekDates;
        return dates.reduce((acc, date) => {
          const prevDate = new Date(date);
          prevDate.setDate(date.getDate() + 2);
          const dateKey = prevDate.toISOString().split('T')[0];
          const decisions = localStorage.getItem(`decisions-${dateKey}`);
          if (decisions) {
            acc.push({ date: prevDate, text: decisions });
          }
          return acc;
        }, [] as { date: Date, text: string }[]);
      }, [selectedMonth, selectedYear, showMonthView, weekDates]);

      const handleToggleMonthView = () => {
        setShowMonthView(!showMonthView);
      };

      const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(parseInt(e.target.value));
      };

      const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedYear(parseInt(e.target.value));
      };

      const getMonthName = (month: number) => {
        const monthNames = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
        return monthNames[month];
      };

      const currentYear = new Date().getFullYear();
      const yearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - 2 + i), [currentYear]);

      const filteredActivities = useMemo(() => {
        if (!showMonthView) return currentWeekActivities;
        return activities.filter(activity => {
          const activityDate = new Date(activity.createdAt);
          return activityDate.getMonth() === selectedMonth && activityDate.getFullYear() === selectedYear;
        });
      }, [activities, currentWeekActivities, selectedMonth, selectedYear, showMonthView]);

      const filteredOverallRate = useMemo(() => {
        if (!showMonthView) return overallRate;
        return overallCompletionRate(filteredActivities);
      }, [filteredActivities, overallCompletionRate, showMonthView]);

      const [showFreeWriting, setShowFreeWriting] = useState(false);

      const toggleShowFreeWriting = () => {
        setShowFreeWriting(!showFreeWriting);
      };

      const mergedActivities = useMemo(() => {
        const merged: Record<string, {
          title: string;
          domainId: string;
          planned: number;
          completed: number;
          completedDays: { [dayIndex: number]: boolean } | undefined;
        }> = {};

        filteredActivities.forEach(activity => {
          if (!merged[activity.title]) {
            merged[activity.title] = {
              title: activity.title,
              domainId: activity.domainId,
              planned: 0,
              completed: 0,
              completedDays: activity.completedDays,
            };
          }
          merged[activity.title].planned += activity.selectedDays.length;
          if (activity.completedDays) {
            merged[activity.title].completed += activity.selectedDays.filter(dayIndex => activity.completedDays[dayIndex]).length;
          }
        });

        return Object.values(merged);
      }, [filteredActivities]);

      const handleDomainClick = (domainId: string) => {
        const domainElement = document.getElementById(`domain-${domainId}`);
        if (domainElement) {
          domainElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      return (
        <div className="p-6 bg-gradient-to-br from-teal-700/90 to-blue-800/90 rounded-lg shadow-lg text-white" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white text-center">تقييم الأداء</h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleDomains} className="p-2 rounded-full bg-amber-400/20 text-amber-400 hover:bg-amber-400/30">
                {showDomains ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <button
                onClick={handleToggleMonthView}
                className="p-2 rounded-full bg-blue-400/20 text-blue-400 hover:bg-blue-400/30"
              >
                {showMonthView ? 'عرض الأسبوع الحالي' : 'عرض الشهر'}
              </button>
              <div className="relative group">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 p-2 rounded-md flex items-center gap-2 transition-colors"
                >
                  <Download size={16} />
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black/80 rounded-md shadow-lg z-50 w-48">
                    <button
                      onClick={() => {
                        handleExport('json');
                        setDropdownOpen(false);
                      }}
                      className="block w-full text-white text-right p-2 hover:bg-white/10 transition-colors"
                    >
                      تصدير JSON
                    </button>
                    <button
                      onClick={() => {
                        handleExport('text');
                        setDropdownOpen(false);
                      }}
                      className="block w-full text-white text-right p-2 hover:bg-white/10 transition-colors"
                    >
                      تصدير نص
                    </button>
                    <button
                      onClick={() => {
                        handleImport('json');
                        setDropdownOpen(false);
                      }}
                      className="block w-full text-white text-right p-2 hover:bg-white/10 transition-colors"
                    >
                      استيراد JSON
                    </button>
                    <button
                      onClick={() => {
                        handleImport('text');
                        setDropdownOpen(false);
                      }}
                      className="block w-full text-white text-right p-2 hover:bg-white/10 transition-colors"
                    >
                      استيراد نص
                    </button>
                  </div>
                )}
                <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} accept="text/plain,application/json" />
              </div>
            </div>
          </div>
          {showMonthView ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className={`bg-black/20 text-white rounded-lg px-3 py-1 border border-white/10 focus:border-white focus:ring-1 focus:ring-white text-sm md:text-base`}
                dir="rtl"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{getMonthName(i)}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className={`bg-black/20 text-white rounded-lg px-3 py-1 border border-white/10 focus:border-white focus:ring-1 focus:ring-white text-sm md:text-base`}
                dir="rtl"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          ) : (
            <WeekSelector currentDate={selectedDate} onWeekChange={changeWeek} />
          )}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-6 rounded-lg">
              <div className="flex items-center justify-center mb-4">
                <div className="text-center">
                  <Brain className="text-purple-400 mx-auto" size={32} />
                  <h2 className="text-2xl font-bold text-purple-400">معدل الإنجاز العام</h2>
                  <p className="text-4xl font-bold text-white mt-2" style={{ textShadow: '0 0 5px rgba(255, 255, 255, 0.3)', color: '#DAA520', filter: 'drop-shadow(0 0 1px #DAA520)' }}>
                    {filteredOverallRate.percentage}%
                  </p>
                  <p className="text-sm text-white">
                    {filteredOverallRate.completed} من {filteredOverallRate.total} أنشطة مكتملة
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                <ProgressView activities={filteredActivities} />
              </div>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 ${showDomains ? '' : 'hidden'}`}>
              {LIFE_DOMAINS.map(domain => {
                const progress = calculateDomainProgress(domain.id, filteredActivities);
                const DomainIcon = domain.icon;
                let domainColor = domain.color;
                switch (domain.id) {
                  case 'professional':
                    domainColor = '#F5F5DC'; // Beige
                    break;
                  case 'educational':
                    domainColor = '#FFD700'; // Gold
                    break;
                  case 'health':
                    domainColor = '#90EE90'; // Light Green
                    break;
                  case 'family':
                    domainColor = '#F08080'; // Red
                    break;
                  case 'social':
                    domainColor = '#FFA500'; // Orange
                    break;
                  case 'financial':
                    domainColor = '#66bb6a'; // Solid Green
                    break;
                  case 'personal':
                    domainColor = '#A0C4FF'; // Light Blue
                    break;
                  case 'spiritual':
                    domainColor = '#40E0D0'; // Turquoise
                    break;
                  default:
                    domainColor = domain.color;
                }
                return (
                  <div id={`domain-${domain.id}`} key={domain.id} className={`bg-black/20 p-4 rounded-lg flex flex-col animate-fade-in`}>
                    <div className="flex items-center gap-2 mb-4">
                      <DomainIcon size={24} className={`text-${domainColor}`} style={{ color: domain.id === 'financial' ? '#fff' : domainColor }} />
                      <h3 className={`text-xl font-bold`} style={{ color: domain.id === 'financial' ? '#66bb6a' : domainColor, textShadow: '0 0 5px rgba(0, 0, 0, 0.5)' }}>{domain.name}</h3>
                      <span className="text-white text-sm ml-2">({progress.percentage}%)</span>
                    </div>
                    <table className="w-full border-collapse animate-table-in">
                      <thead>
                        <tr>
                          <th className="p-2 text-white border border-white/20 text-left">النشاط</th>
                          <th className="p-2 text-white border border-white/20 text-center">المخطط/المنفذ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedActivities
                          .filter(activity => activity.domainId === domain.id)
                          .map(activity => {
                            const completedPercentage = activity.planned > 0 ? Math.round((activity.completed / activity.planned) * 100) : 0;
                            let statusIcon = null;
                            if (completedPercentage === 100) {
                              statusIcon = <Check size={16} className="text-green-500" />;
                            } else if (completedPercentage > 0) {
                              statusIcon = <AlertTriangle size={16} className="text-amber-500" />;
                            } else {
                              statusIcon = <X size={16} className="text-red-500" />;
                            }
                            return (
                              <tr key={activity.title} className="animate-row-in">
                                <td className="p-2 text-white border border-white/20 text-right flex items-center gap-1">
                                  {activity.title}
                                  {statusIcon}
                                </td>
                                <td className="p-2 text-white border border-white/20 text-center">
                                  {activity.planned} / {activity.completed}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                <Lightbulb size={24} className="text-orange-400" />
                أبرز الإنجازات في الأسبوع
              </h2>
              {achievements.map((achievement, index) => (
                <div key={index} className="relative mb-2 bg-black/30 p-4 rounded-lg border border-orange-400/20">
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => handleAchievementChange(index, e.target.value)}
                    className="w-full p-1 rounded bg-black/20 border border-white/10 text-white text-sm"
                    dir="rtl"
                    placeholder={`إنجاز ${index + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveAchievement(index)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-red-400/20 text-red-400 hover:bg-red-400/30"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddAchievement}
                className="bg-orange-400 hover:bg-orange-500 text-white p-2 rounded-md flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                إضافة إنجاز
              </button>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <MessageSquare size={20} className="text-white" />
                  القرارات
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {DAYS.map((day, index) => (
                          <th key={day} className="p-2 text-white border border-white/20">
                            <div className="flex flex-col items-center">
                              <span>{day}</span>
                              <span className="text-sm text-white/70">{formatDate(weekDates[index])}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {showMonthView ? allDecisions.map((item, index) => (
                          <td key={index} className="p-2 text-white border border-white/20 align-top">
                            <p className="text-white text-sm" dangerouslySetInnerHTML={{ __html: makeLinksClickable(item.text) }} />
                          </td>
                        )) : weekDates.map((date, index) => {
                          const nextDate = new Date(date);
                          nextDate.setDate(date.getDate() + 1);
                          const dateKey = nextDate.toISOString().split('T')[0];
                          const decisions = localStorage.getItem(`decisions-${dateKey}`);
                          return (
                            <td key={index} className="p-2 text-white border border-white/20 align-top">
                              <p className="text-white text-sm" dangerouslySetInnerHTML={{ __html: makeLinksClickable(decisions || '') }} />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Sparkles size={20} className="text-white" />
                  ملخص النقاط الإيجابية من صفحة الكتابة
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {DAYS.map((day, index) => (
                          <th key={day} className="p-2 text-white border border-white/20">
                            <div className="flex flex-col items-center">
                              <span>{day}</span>
                              <span className="text-sm text-white/70">{formatDate(weekDates[index])}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {showMonthView ? allPositiveNotes.map((item, index) => (
                          <td key={index} className="p-2 text-white border border-white/20 align-top">
                            <ul className="list-disc list-inside text-white/70 text-sm" dir="rtl">
                              {item && (
                                item.notes.map((note, noteIndex) => (
                                  <li key={noteIndex} dangerouslySetInnerHTML={{ __html: makeLinksClickable(note) }} />
                                ))
                              )}
                            </ul>
                          </td>
                        )) : weekDates.map((date, index) => {
                          const nextDate = new Date(date);
                          nextDate.setDate(date.getDate() + 1);
                          const dateKey = nextDate.toISOString().split('T')[0];
                          const notes = localStorage.getItem(`positiveNotes-${dateKey}`);
                          let parsedNotes: string[] = [];
                          if (notes) {
                            try {
                              parsedNotes = JSON.parse(notes);
                            } catch (e) {
                              console.error("Error parsing positive notes:", notes, e);
                            }
                          }
                          return (
                            <td key={index} className="p-2 text-white border border-white/20 align-top">
                              <ul className="list-disc list-inside text-white/70 text-sm" dir="rtl">
                                {parsedNotes && (
                                  parsedNotes.map((note, noteIndex) => (
                                    <li key={noteIndex} dangerouslySetInnerHTML={{ __html: makeLinksClickable(note) }} />
                                  ))
                                )}
                              </ul>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </div>
      );
    }
