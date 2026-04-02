import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Student, generateAcademicRecords, generateParticipationRecords, generateActivityHistory } from '@/lib/mock-data';
import { theme } from '@/lib/theme';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
}

export function StudentDetail({ student, onBack }: StudentDetailProps) {
  const academicRecords = generateAcademicRecords(student.id);
  const participationRecords = generateParticipationRecords(student.id);
  const activityHistory = generateActivityHistory(student.id);

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const getPerformanceBadgeStyle = (status: Student['performanceStatus']) => {
    switch (status) {
      case 'excellent':
        return { bg: '#E8F3EC', text: theme.colors.success };
      case 'good':
        return { bg: '#E8EDF3', text: theme.colors.complement };
      case 'needs-improvement':
        return { bg: '#FCEAEA', text: theme.colors.error };
    }
  };

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A':
        return { bg: '#E8F3EC', text: theme.colors.success };
      case 'B':
        return { bg: '#E8EDF3', text: theme.colors.complement };
      case 'C':
        return { bg: '#FFF4E6', text: theme.colors.warning };
      case 'D':
        return { bg: '#FFE8CC', text: '#CC7A3B' };
      case 'F':
        return { bg: '#FCEAEA', text: theme.colors.error };
      default:
        return { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
    }
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'academic':
        return { bg: '#E8EDF3', text: theme.colors.complement };
      case 'attendance':
        return { bg: '#F0EDF5', text: '#7B68A0' };
      case 'behavior':
        return { bg: '#FFF4E6', text: theme.colors.warning };
      case 'achievement':
        return { bg: '#E8F3EC', text: theme.colors.success };
      default:
        return { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
    }
  };

  const performanceBadge = getPerformanceBadgeStyle(student.performanceStatus);

  return (
    <div className="p-3 sm:p-6">
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="mb-4 hover:bg-opacity-10"
        style={{ color: theme.colors.accent }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.accent}15`}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Students
      </Button>

      <Card className="mb-4 sm:mb-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mx-auto sm:mx-0" style={{ borderWidth: '2px', borderColor: theme.colors.accent }}>
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback style={{ backgroundColor: '#E8EDF3', color: theme.colors.complement }} className="font-semibold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{student.name}</h2>
                  <p className="text-sm sm:text-base" style={{ color: theme.colors.secondaryText }}>Student ID: {student.studentId}</p>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0 justify-center sm:justify-start">
                  <Badge style={{ backgroundColor: performanceBadge.bg, color: performanceBadge.text, border: 'none' }}>
                    {student.performanceStatus === 'needs-improvement' ? 'Needs Improvement' : student.performanceStatus.charAt(0).toUpperCase() + student.performanceStatus.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>Email</p>
                    <p className="text-xs sm:text-sm font-medium truncate" style={{ color: theme.colors.primaryText }}>{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                  <div>
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>Phone</p>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>{student.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                  <div>
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>GPA</p>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>{student.gpa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                  <div>
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>Join Date</p>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>{new Date(student.joinDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="academic" className="w-full">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex sm:grid w-auto sm:w-full grid-cols-4 gap-1" style={{ backgroundColor: theme.colors.chartBg }}>
            <TabsTrigger value="academic" className="text-xs sm:text-sm whitespace-nowrap">Academic</TabsTrigger>
            <TabsTrigger value="grades" className="text-xs sm:text-sm whitespace-nowrap">Grades</TabsTrigger>
            <TabsTrigger value="participation" className="text-xs sm:text-sm whitespace-nowrap">Activities</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap">History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="academic" className="mt-4">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Academic Records</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {academicRecords.map((record) => {
                  const gradeStyle = getGradeStyle(record.grade);
                  return (
                    <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 sm:pb-3 gap-2" style={{ borderColor: theme.colors.border }}>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-semibold truncate" style={{ color: theme.colors.primaryText }}>{record.subject}</h4>
                        <p className="text-xs sm:text-sm truncate" style={{ color: theme.colors.secondaryText }}>{record.teacher} • {record.term}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>{record.score}%</p>
                          <p className="text-xs" style={{ color: theme.colors.secondaryText }}>{record.credits} Credits</p>
                        </div>
                        <Badge style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: 'none' }}>
                          {record.grade}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Grade Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Current GPA</p>
                    <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{student.gpa}</p>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Attendance</p>
                    <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{student.attendance}%</p>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Grade Level</p>
                    <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{student.gradeLevel.split(' ')[0]}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: theme.colors.primaryText }}>Subject</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: theme.colors.primaryText }}>Fall 2023</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: theme.colors.primaryText }}>Spring 2024</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: theme.colors.primaryText }}>Fall 2024</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(academicRecords.map(r => r.subject))).map((subject) => {
                      const subjectRecords = academicRecords.filter(r => r.subject === subject);
                      return (
                        <tr key={subject} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: theme.colors.primaryText }}>{subject}</td>
                          {['Fall 2023', 'Spring 2024', 'Fall 2024'].map((term) => {
                            const record = subjectRecords.find(r => r.term === term);
                            const gradeStyle = record ? getGradeStyle(record.grade) : null;
                            return (
                              <td key={term} className="py-2 sm:py-3 px-2 sm:px-4">
                                {record && gradeStyle ? (
                                  <Badge style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: 'none' }}>
                                    {record.grade} ({record.score}%)
                                  </Badge>
                                ) : (
                                  <span style={{ color: theme.colors.secondaryText }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participation" className="mt-4">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Participation & Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {participationRecords.map((record) => {
                  const statusStyle = record.status === 'active' 
                    ? { bg: '#E8F3EC', text: theme.colors.success }
                    : { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
                  return (
                    <Card key={record.id} style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm sm:text-base font-semibold truncate" style={{ color: theme.colors.primaryText }}>{record.activity}</h4>
                            <p className="text-xs sm:text-sm" style={{ color: theme.colors.secondaryText }}>{record.role}</p>
                          </div>
                          <Badge className="text-xs whitespace-nowrap" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, border: 'none' }}>
                            {record.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                          <span style={{ color: theme.colors.secondaryText }}>Hours:</span>
                          <span className="font-medium" style={{ color: theme.colors.primaryText }}>{record.hoursContributed}</span>
                        </div>
                        <Badge className="mt-2" style={{ backgroundColor: theme.colors.surface, color: theme.colors.accent, borderColor: theme.colors.border }}>
                          {record.type}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Activity History</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {activityHistory.map((activity) => {
                  const categoryStyle = getCategoryStyle(activity.category);
                  return (
                    <div key={activity.id} className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 items-start border-b pb-2 sm:pb-3" style={{ borderColor: theme.colors.border }}>
                      <div className="w-full sm:w-28">
                        <Badge className="text-xs" style={{ backgroundColor: categoryStyle.bg, color: categoryStyle.text, border: 'none' }}>
                          {activity.category}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-medium" style={{ color: theme.colors.primaryText }}>{activity.action}</h4>
                        <p className="text-xs sm:text-sm mt-1" style={{ color: theme.colors.secondaryText }}>{activity.description}</p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-28">
                        <span className="text-xs sm:text-sm whitespace-nowrap" style={{ color: theme.colors.secondaryText }}>{new Date(activity.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
