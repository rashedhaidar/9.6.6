import React from 'react';
    import { Activity } from '../types/activity';
    import { useWeekSelection } from '../hooks/useWeekSelection';
    import { LIFE_DOMAINS } from '../types/domains';
    import { BarChart, Target, CheckCircle } from 'lucide-react';

    interface ProgressViewProps {
      activities: Activity[];
      useMainCheckbox?: boolean;
    }

    export function ProgressView({ activities, useMainCheckbox = false }: ProgressViewProps) {
      const { weekNumber, year } = useWeekSelection();

      const calculateDomainProgress = (domainId: string) => {
        const domainActivities = activities.filter(a => a.domainId === domainId);
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
      };

      const handleDomainClick = (domainId: string) => {
        const domainElement = document.getElementById(`domain-${domainId}`);
        if (domainElement) {
          domainElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {LIFE_DOMAINS.map(domain => {
              const { completed, total, percentage } = calculateDomainProgress(domain.id);
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
                <div
                  key={domain.id}
                  onClick={() => handleDomainClick(domain.id)}
                  className={`cursor-pointer p-4 rounded-lg flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <DomainIcon size={24} className={`text-${domainColor}`} style={{ color: domain.id === 'financial' ? '#fff' : domainColor }} />
                    <h3 className={`text-lg font-medium`} style={{ color: domain.id === 'financial' ? '#66bb6a' : domainColor, textShadow: '0 0 5px rgba(0, 0, 0, 0.5)' }}>{domain.name}</h3>
                  </div>
                  <div className="relative w-full h-4 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ease-in-out`}
                      style={{
                        width: `${percentage}%`,
                        background: domainColor,
                        borderRadius: '10px',
                        opacity: 0.8,
                        boxShadow: `0 0 5px ${domainColor}`,
                      }}
                    />
                    <span 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold z-10 flex items-center justify-center w-full h-full"
                      style={{
                        WebkitFilter: `none`,
                        filter: `none`,
                      }}
                    >
                      {percentage}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/70">
                    {completed} / {total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
