import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPrograms, Program } from '@/lib/mock-data';
import { Users, Calendar, TrendingUp, FolderKanban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProgramTimeline } from './program-timeline';
import { theme } from '@/lib/theme';

export function ProgramManagement() {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const filteredPrograms = mockPrograms.filter((program) => {
    const matchesType = filterType === 'all' || program.type === filterType;
    const matchesStatus = filterStatus === 'all' || program.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const getStatusBadgeClass = (status: Program['status']) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F3EC', text: '#5BB46C' };
      case 'planning':
        return { bg: '#E8EDF3', text: '#6C7C9B' };
      case 'completed':
        return { bg: '#F2F2F2', text: '#6B6B6B' };
      case 'on-hold':
        return { bg: '#FFF4E6', text: '#E0A25B' };
    }
  };

  const getTypeBadgeClass = (type: Program['type']) => {
    switch (type) {
      case 'curriculum':
        return { bg: '#F0EDF5', text: '#7BA68C' };
      case 'enrollment':
        return { bg: '#E8EDF3', text: '#6C7C9B' };
      case 'training':
        return { bg: '#E8F3EC', text: '#5BB46C' };
    }
  };

  const activePrograms = filteredPrograms.filter(p => p.status === 'active').length;
  const totalParticipants = filteredPrograms.reduce((sum, p) => sum + p.participants, 0);
  const avgProgress = filteredPrograms.length > 0 
    ? Math.round(filteredPrograms.reduce((sum, p) => sum + p.progress, 0) / filteredPrograms.length)
    : 0;

  const enrollmentPrograms = filteredPrograms.filter(p => p.type === 'enrollment');
  const pendingEnrollments = enrollmentPrograms.filter(p => p.status === 'active' || p.status === 'planning').length;
  const completedEnrollments = enrollmentPrograms.filter(p => p.status === 'completed').length;
  const inProgressEnrollments = enrollmentPrograms.filter(p => p.status === 'active').length;

  return (
    <TooltipProvider>
      <div className="px-3 py-3 sm:p-6 animate-in fade-in duration-300 w-full box-border">
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:max-w-2xl w-full box-border">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="curriculum">Curriculum</SelectItem>
                <SelectItem value="enrollment">Enrollment</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Active Programs</p>
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{activePrograms}</p>
                  <p className="text-xs mt-1" style={{ color: theme.colors.secondaryText }}>of {filteredPrograms.length} total</p>
                </div>
                <FolderKanban className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.accent }} />
              </div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Total Participants</p>
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{totalParticipants}</p>
                </div>
                <Users className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.complement }} />
              </div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Avg. Progress</p>
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{avgProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.success }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {filteredPrograms.map((program) => {
            const statusBadge = getStatusBadgeClass(program.status);
            const typeBadge = getTypeBadgeClass(program.type);
            
            return (
              <Card 
                key={program.id} 
                className="transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelectedProgram(program)}
                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg" style={{ color: theme.colors.primaryText }}>{program.name}</CardTitle>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge style={{ backgroundColor: typeBadge.bg, color: typeBadge.text, border: 'none' }}>
                            {program.type}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Program Type</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge style={{ backgroundColor: statusBadge.bg, color: statusBadge.text, border: 'none' }}>
                            {program.status}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current Status</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2" style={{ color: theme.colors.secondaryText }}>{program.description}</p>
                  
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-xs sm:text-sm cursor-help">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                          <span className="whitespace-nowrap" style={{ color: theme.colors.secondaryText }}>Participants:</span>
                          <span className="font-medium" style={{ color: theme.colors.primaryText }}>{program.participants}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of active participants</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                      <span className="whitespace-nowrap" style={{ color: theme.colors.secondaryText }}>Timeline:</span>
                      <span className="font-medium text-xs truncate" style={{ color: theme.colors.primaryText }}>
                        {new Date(program.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(program.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                      <span className="whitespace-nowrap" style={{ color: theme.colors.secondaryText }}>Coordinator:</span>
                      <span className="font-medium truncate" style={{ color: theme.colors.primaryText }}>{program.coordinator}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>Progress</span>
                      <span className="text-xs sm:text-sm font-semibold" style={{ color: theme.colors.primaryText }}>{program.progress}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.colors.accent}20` }}>
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
            );
          })}
        </div>

        <Card className="transition-shadow duration-300" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle style={{ color: theme.colors.primaryText }}>Enrollment Workflow Tracker</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {enrollmentPrograms.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-xs sm:text-sm" style={{ color: theme.colors.secondaryText }}>No enrollment programs match the selected filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div 
                  className="text-center p-4 sm:p-6 border rounded-lg transition-colors duration-200" 
                  style={{ borderColor: theme.colors.border }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFF4E6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <p className="text-xs sm:text-sm mb-2" style={{ color: theme.colors.secondaryText }}>Pending</p>
                  <p className="text-3xl sm:text-4xl font-bold" style={{ color: theme.colors.warning }}>{pendingEnrollments}</p>
                  <div className="relative h-1 w-full overflow-hidden rounded-full mt-3" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        backgroundColor: theme.colors.accent,
                        width: `${enrollmentPrograms.length > 0 ? (pendingEnrollments / enrollmentPrograms.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div 
                  className="text-center p-4 sm:p-6 border rounded-lg transition-colors duration-200" 
                  style={{ borderColor: theme.colors.border }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8EDF3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <p className="text-xs sm:text-sm mb-2" style={{ color: theme.colors.secondaryText }}>In Progress</p>
                  <p className="text-3xl sm:text-4xl font-bold" style={{ color: theme.colors.complement }}>{inProgressEnrollments}</p>
                  <div className="relative h-1 w-full overflow-hidden rounded-full mt-3" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        backgroundColor: theme.colors.accent,
                        width: `${enrollmentPrograms.length > 0 ? (inProgressEnrollments / enrollmentPrograms.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div 
                  className="text-center p-4 sm:p-6 border rounded-lg transition-colors duration-200" 
                  style={{ borderColor: theme.colors.border }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8F3EC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <p className="text-xs sm:text-sm mb-2" style={{ color: theme.colors.secondaryText }}>Completed</p>
                  <p className="text-3xl sm:text-4xl font-bold" style={{ color: theme.colors.success }}>{completedEnrollments}</p>
                  <div className="relative h-1 w-full overflow-hidden rounded-full mt-3" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        backgroundColor: theme.colors.accent,
                        width: `${enrollmentPrograms.length > 0 ? (completedEnrollments / enrollmentPrograms.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProgram && (
          <ProgramTimeline
            program={selectedProgram}
            open={!!selectedProgram}
            onClose={() => setSelectedProgram(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
