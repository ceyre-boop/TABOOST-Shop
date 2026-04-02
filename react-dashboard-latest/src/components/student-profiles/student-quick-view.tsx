import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Student, generateAcademicRecords } from '@/lib/mock-data';
import { Mail, Phone, Calendar, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { theme } from '@/lib/theme';

interface StudentQuickViewProps {
  student: Student;
  open: boolean;
  onClose: () => void;
}

export function StudentQuickView({ student, open, onClose }: StudentQuickViewProps) {
  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const academicRecords = generateAcademicRecords(student.id);
  const recentRecords = academicRecords.filter(r => r.term === 'Fall 2024').slice(0, 3);

  const getPerformanceBadgeStyle = (status: Student['performanceStatus']) => {
    switch (status) {
      case 'excellent':
        return { bg: '#E8F3EC', text: '#5BB46C' };
      case 'good':
        return { bg: '#E8EDF3', text: '#6C7C9B' };
      case 'needs-improvement':
        return { bg: '#FCEAEA', text: '#D75B5B' };
    }
  };

  const performanceBadge = getPerformanceBadgeStyle(student.performanceStatus);

  const getAttendanceColor = (attendance: number) => {
    if (attendance >= 90) return theme.colors.success;
    if (attendance >= 80) return theme.colors.accent;
    if (attendance >= 70) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: theme.colors.primaryText }}>Student Quick View</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20" style={{ borderWidth: '2px', borderColor: theme.colors.accent }}>
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback style={{ backgroundColor: '#E8EDF3', color: theme.colors.complement }} className="font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: theme.colors.primaryText }}>{student.name}</h3>
                  <p style={{ color: theme.colors.secondaryText }}>ID: {student.studentId}</p>
                </div>
                <Badge style={{ backgroundColor: performanceBadge.bg, color: performanceBadge.text, border: 'none' }}>
                  {student.performanceStatus === 'needs-improvement' ? 'Needs Improvement' : student.performanceStatus.charAt(0).toUpperCase() + student.performanceStatus.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" style={{ color: theme.colors.secondaryText }} />
                  <span className="truncate" style={{ color: theme.colors.secondaryText }}>{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" style={{ color: theme.colors.secondaryText }} />
                  <span style={{ color: theme.colors.secondaryText }}>{student.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" style={{ color: theme.colors.secondaryText }} />
                  <span style={{ color: theme.colors.secondaryText }}>GPA: {student.gpa}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" style={{ color: theme.colors.secondaryText }} />
                  <span style={{ color: theme.colors.secondaryText }}>{student.gradeLevel}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: theme.colors.primaryText }}>Attendance</h4>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${getAttendanceColor(student.attendance)}20` }}>
                <div 
                  className="h-full transition-all"
                  style={{ 
                    backgroundColor: getAttendanceColor(student.attendance),
                    width: `${student.attendance}%` 
                  }}
                />
              </div>
              <span className="text-sm font-medium min-w-[40px]" style={{ color: theme.colors.primaryText }}>{student.attendance}%</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: theme.colors.primaryText }}>Recent Grades</h4>
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: theme.colors.chartBg }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: theme.colors.primaryText }}>{record.subject}</p>
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>{record.term}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: theme.colors.primaryText }}>{record.score}%</span>
                    <Badge style={{ backgroundColor: theme.colors.surface, color: theme.colors.accent, borderColor: theme.colors.border }} className="min-w-[40px] justify-center">
                      {record.grade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
