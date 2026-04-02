import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, FolderKanban, CheckSquare, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { mockStudents, mockPrograms, mockTasks } from '@/lib/mock-data';

export function DashboardOverview() {
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);
  const [showAllUrgent, setShowAllUrgent] = useState(false);

  const totalStudents = mockStudents.length;
  const activeStudents = mockStudents.filter(s => s.enrollmentStatus === 'active').length;
  const averageGPA = (mockStudents.reduce((sum, s) => sum + s.gpa, 0) / mockStudents.length).toFixed(2);
  const totalPrograms = mockPrograms.length;
  const activePrograms = mockPrograms.filter(p => p.status === 'active').length;
  const totalTasks = mockTasks.length;
  const pendingTasks = mockTasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;

  const atRiskStudents = mockStudents.filter(s => 
    s.performanceStatus === 'needs-improvement' || s.attendance < 80
  );

  const urgentTasks = mockTasks.filter(t => {
    const daysUntil = Math.ceil((new Date(t.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3 && t.status !== 'completed';
  });

  const upcomingPrograms = mockPrograms.filter(p => {
    const daysUntilStart = Math.ceil((new Date(p.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilStart > 0 && daysUntilStart <= 14 && p.status === 'planning';
  });

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const displayedAtRiskStudents = showAllAtRisk ? atRiskStudents : atRiskStudents.slice(0, 4);
  const displayedUrgentTasks = showAllUrgent ? urgentTasks : urgentTasks.slice(0, 4);

  return (
    <div className="px-3 py-3 sm:p-6 w-full box-border">
      <div className="mb-4 sm:mb-6">
        <div>
          <p className="text-xs sm:text-sm" style={{ color: '#6B6B6B' }}>{todayDate}</p>
          <p className="text-base sm:text-lg font-medium mt-1" style={{ color: '#2C2C2C' }}>Welcome back! Here's your overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: '#6B6B6B' }}>Total Students</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#2C2C2C' }}>{totalStudents}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>{activeStudents} active</p>
              </div>
              <Users className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#6C7C9B' }} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: '#6B6B6B' }}>Average GPA</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#2C2C2C' }}>{averageGPA}</p>
              </div>
              <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#5BB46C' }} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: '#6B6B6B' }}>Total Programs</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#2C2C2C' }}>{totalPrograms}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>{activePrograms} active</p>
              </div>
              <FolderKanban className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#7BA68C' }} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: '#6B6B6B' }}>Total Tasks</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#2C2C2C' }}>{totalTasks}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>{pendingTasks} pending</p>
              </div>
              <CheckSquare className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#E0A25B' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#2C2C2C' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#D75B5B' }} />
              At-Risk Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: '#6B6B6B' }}>
              Students requiring immediate attention
            </p>
            <div className={`space-y-3 ${showAllAtRisk ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}>
              {displayedAtRiskStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors"
                  style={{ backgroundColor: '#FCEAEA' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{student.name}</p>
                    <p className="text-xs" style={{ color: '#6B6B6B' }}>
                      GPA: {student.gpa} | Attendance: {student.attendance}%
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#D75B5B' }} />
                </div>
              ))}
              {atRiskStudents.length > 4 && (
                <button
                  onClick={() => setShowAllAtRisk(!showAllAtRisk)}
                  className="text-xs text-center pt-2 w-full cursor-pointer hover:underline transition-all"
                  style={{ color: '#6C7C9B' }}
                >
                  {showAllAtRisk ? 'Show less' : `+${atRiskStudents.length - 4} more students`}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#2C2C2C' }}>
              <Clock className="h-5 w-5" style={{ color: '#E0A25B' }} />
              Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: '#6B6B6B' }}>
              Tasks due in 3 days or less
            </p>
            <div className={`space-y-3 ${showAllUrgent ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2" style={{ color: '#5BB46C' }} />
                  <p className="text-sm" style={{ color: '#6B6B6B' }}>No urgent tasks</p>
                </div>
              ) : (
                <>
                  {displayedUrgentTasks.map((task) => {
                    const daysUntil = Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div 
                        key={task.id} 
                        className="p-2 sm:p-3 rounded-lg transition-colors"
                        style={{ backgroundColor: '#FFF4E6' }}
                      >
                        <p className="text-xs sm:text-sm font-medium mb-1 line-clamp-1" style={{ color: '#2C2C2C' }}>{task.title}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate mr-2" style={{ color: '#6B6B6B' }}>{task.assignee}</span>
                          <span style={{ color: '#E0A25B' }}>
                            {daysUntil === 0 ? 'Due today' : `${daysUntil} days left`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {urgentTasks.length > 4 && (
                    <button
                      onClick={() => setShowAllUrgent(!showAllUrgent)}
                      className="text-xs text-center pt-2 w-full cursor-pointer hover:underline transition-all"
                      style={{ color: '#6C7C9B' }}
                    >
                      {showAllUrgent ? 'Show less' : `+${urgentTasks.length - 4} more tasks`}
                    </button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#2C2C2C' }}>
              <Calendar className="h-5 w-5" style={{ color: '#6C7C9B' }} />
              Upcoming Programs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: '#6B6B6B' }}>
              Programs starting in next 2 weeks
            </p>
            <div className="space-y-3">
              {upcomingPrograms.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2" style={{ color: '#6C7C9B' }} />
                  <p className="text-sm" style={{ color: '#6B6B6B' }}>No upcoming programs</p>
                </div>
              ) : (
                <>
                  {upcomingPrograms.slice(0, 3).map((program) => {
                    const daysUntil = Math.ceil((new Date(program.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div 
                        key={program.id} 
                        className="p-2 sm:p-3 rounded-lg transition-colors"
                        style={{ backgroundColor: '#E8EDF3' }}
                      >
                        <p className="text-xs sm:text-sm font-medium mb-1 line-clamp-1" style={{ color: '#2C2C2C' }}>{program.name}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate mr-2" style={{ color: '#6B6B6B' }}>{program.coordinator}</span>
                          <span className="whitespace-nowrap" style={{ color: '#6C7C9B' }}>Starts in {daysUntil} days</span>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingPrograms.length > 3 && (
                    <p className="text-xs text-center pt-2" style={{ color: '#6B6B6B' }}>
                      +{upcomingPrograms.length - 3} more programs
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardHeader>
            <CardTitle style={{ color: '#2C2C2C' }}>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#5BB46C' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>New student enrollment completed</p>
                  <p className="text-xs" style={{ color: '#6B6B6B' }}>2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#6C7C9B' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>Curriculum update approved</p>
                  <p className="text-xs" style={{ color: '#6B6B6B' }}>5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#E0A25B' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>Teacher training session scheduled</p>
                  <p className="text-xs" style={{ color: '#6B6B6B' }}>1 day ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#7BA68C' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>Parent-teacher conferences confirmed</p>
                  <p className="text-xs" style={{ color: '#6B6B6B' }}>2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#D75B5B' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>Budget review meeting rescheduled</p>
                  <p className="text-xs" style={{ color: '#6B6B6B' }}>3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
          <CardHeader>
            <CardTitle style={{ color: '#2C2C2C' }}>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium" style={{ color: '#2C2C2C' }}>Excellent</span>
                  <span className="text-xs sm:text-sm" style={{ color: '#6B6B6B' }}>
                    {mockStudents.filter(s => s.performanceStatus === 'excellent').length} students
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#F2F2F2' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: '#5BB46C',
                      width: `${(mockStudents.filter(s => s.performanceStatus === 'excellent').length / mockStudents.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium" style={{ color: '#2C2C2C' }}>Good</span>
                  <span className="text-xs sm:text-sm" style={{ color: '#6B6B6B' }}>
                    {mockStudents.filter(s => s.performanceStatus === 'good').length} students
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#F2F2F2' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: '#6C7C9B',
                      width: `${(mockStudents.filter(s => s.performanceStatus === 'good').length / mockStudents.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium" style={{ color: '#2C2C2C' }}>Needs Improvement</span>
                  <span className="text-xs sm:text-sm" style={{ color: '#6B6B6B' }}>
                    {mockStudents.filter(s => s.performanceStatus === 'needs-improvement').length} students
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#F2F2F2' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: '#D75B5B',
                      width: `${(mockStudents.filter(s => s.performanceStatus === 'needs-improvement').length / mockStudents.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
