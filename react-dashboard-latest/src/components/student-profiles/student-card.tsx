import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Student } from '@/lib/mock-data';
import { TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudentCardProps {
  student: Student;
  onClick: () => void;
  onQuickView: (e: React.MouseEvent) => void;
}

export function StudentCard({ student, onClick, onQuickView }: StudentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getPerformanceBadgeClass = (status: Student['performanceStatus']) => {
    switch (status) {
      case 'excellent':
        return { bg: '#5BB46C', text: '#FFFFFF' };
      case 'good':
        return { bg: '#6C7C9B', text: '#FFFFFF' };
      case 'needs-improvement':
        return { bg: '#D75B5B', text: '#FFFFFF' };
    }
  };

  const getEnrollmentBadgeClass = (status: Student['enrollmentStatus']) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F3EC', text: '#5BB46C' };
      case 'inactive':
        return { bg: '#F2F2F2', text: '#6B6B6B' };
      case 'graduated':
        return { bg: '#E8EDF3', text: '#6C7C9B' };
      case 'suspended':
        return { bg: '#FCEAEA', text: '#D75B5B' };
    }
  };

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const perfBadge = getPerformanceBadgeClass(student.performanceStatus);
  const enrollBadge = getEnrollmentBadgeClass(student.enrollmentStatus);

  return (
    <Card 
      className="cursor-pointer transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E3E3E3',
        boxShadow: isHovered ? '0 10px 25px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to right, #F3F6F4, #EEF1F5)',
          opacity: isHovered ? 1 : 0,
        }}
      ></div>
      
      <CardContent className="p-6 relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback style={{ backgroundColor: '#E8F3EC', color: '#7BA68C' }} className="font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 transition-all duration-200"
              style={{ 
                backgroundColor: student.enrollmentStatus === 'active' ? '#5BB46C' : '#D9D9D9',
                borderColor: '#FFFFFF',
              }}
            ></div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: '#2C2C2C' }}>{student.name}</h3>
            <p className="text-sm" style={{ color: '#6B6B6B' }}>ID: {student.studentId}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={onQuickView}
            type="button"
            style={{
              color: '#7BA68C',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E8F3EC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" style={{ color: '#6B6B6B' }} />
            <span style={{ color: '#6B6B6B' }}>GPA:</span>
            <span className="font-medium" style={{ color: '#2C2C2C' }}>{student.gpa}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#6B6B6B' }}>Grade:</span>
            <span className="font-medium" style={{ color: '#2C2C2C' }}>{student.gradeLevel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#6B6B6B' }}>Attendance:</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 rounded-full h-1.5 max-w-[100px]" style={{ backgroundColor: '#F2F2F2' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: student.attendance >= 90 ? '#5BB46C' : student.attendance >= 75 ? '#E0A25B' : '#D75B5B',
                    width: `${student.attendance}%`,
                  }}
                ></div>
              </div>
              <span className="font-medium" style={{ color: '#2C2C2C' }}>{student.attendance}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge 
            className="transition-transform duration-200 hover:scale-105"
            style={{
              backgroundColor: perfBadge.bg,
              color: perfBadge.text,
              border: 'none',
            }}
          >
            {student.performanceStatus === 'needs-improvement' ? 'Needs Improvement' : student.performanceStatus.charAt(0).toUpperCase() + student.performanceStatus.slice(1)}
          </Badge>
          <Badge 
            className="transition-transform duration-200 hover:scale-105"
            style={{
              backgroundColor: enrollBadge.bg,
              color: enrollBadge.text,
              border: 'none',
            }}
          >
            {student.enrollmentStatus.charAt(0).toUpperCase() + student.enrollmentStatus.slice(1)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
