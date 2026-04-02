import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Program } from '@/lib/mock-data';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { theme } from '@/lib/theme';

interface ProgramTimelineProps {
  program: Program;
  open: boolean;
  onClose: () => void;
}

export function ProgramTimeline({ program, open, onClose }: ProgramTimelineProps) {
  const getStatusBadgeStyle = (status: Program['status']) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F3EC', text: theme.colors.success };
      case 'planning':
        return { bg: '#E8EDF3', text: theme.colors.complement };
      case 'completed':
        return { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
      case 'on-hold':
        return { bg: '#FFF4E6', text: theme.colors.warning };
    }
  };

  const statusBadge = getStatusBadgeStyle(program.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between" style={{ color: theme.colors.primaryText }}>
            <span>{program.name}</span>
            <Badge style={{ backgroundColor: statusBadge.bg, color: statusBadge.text, border: 'none' }}>
              {program.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardContent className="p-6">
              <p className="text-sm mb-4" style={{ color: theme.colors.secondaryText }}>{program.description}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: theme.colors.secondaryText }}>Participants</p>
                  <p className="text-2xl font-bold" style={{ color: theme.colors.primaryText }}>{program.participants}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: theme.colors.secondaryText }}>Coordinator</p>
                  <p className="text-lg font-semibold" style={{ color: theme.colors.primaryText }}>{program.coordinator}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: theme.colors.primaryText }}>Overall Progress</p>
                  <p className="text-sm font-bold" style={{ color: theme.colors.primaryText }}>{program.progress}%</p>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      backgroundColor: theme.colors.accent,
                      width: `${program.progress}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.primaryText }}>
              <Calendar className="h-5 w-5" style={{ color: theme.colors.accent }} />
              Program Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ backgroundColor: theme.colors.border }}></div>
              <div className="space-y-6">
                {program.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative flex items-start gap-4 pl-12">
                    <div 
                      className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300`}
                      style={{
                        backgroundColor: milestone.completed ? theme.colors.success : theme.colors.surface,
                        border: milestone.completed ? 'none' : `2px solid ${theme.colors.border}`,
                        color: milestone.completed ? theme.colors.surface : theme.colors.secondaryText
                      }}
                    >
                      {milestone.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 
                            className="font-semibold" 
                            style={{ color: milestone.completed ? theme.colors.primaryText : theme.colors.secondaryText }}
                          >
                            {milestone.title}
                          </h4>
                          <p className="text-sm" style={{ color: theme.colors.secondaryText }}>
                            {new Date(milestone.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {milestone.completed && (
                          <Badge style={{ backgroundColor: '#E8F3EC', color: theme.colors.success, border: 'none' }}>
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Card style={{ backgroundColor: '#E8EDF3', borderColor: theme.colors.complement }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.colors.complement }}>Program Timeline</p>
                  <p className="text-xs mt-1" style={{ color: theme.colors.complement }}>
                    {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: theme.colors.complement }}>
                    {Math.round((new Date().getTime() - new Date(program.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.complement }}>elapsed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
