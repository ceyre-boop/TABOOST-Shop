import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockStudents } from '@/lib/mock-data';
import { StudentCard } from './student-card';
import { StudentDetail } from './student-detail';
import { StudentQuickView } from './student-quick-view';

export function StudentProfiles() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [quickViewStudentId, setQuickViewStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>('all');

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.studentId.includes(searchQuery);
    const matchesGrade = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
    const matchesPerformance = performanceFilter === 'all' || student.performanceStatus === performanceFilter;
    const matchesEnrollment = enrollmentFilter === 'all' || student.enrollmentStatus === enrollmentFilter;
    
    return matchesSearch && matchesGrade && matchesPerformance && matchesEnrollment;
  });

  const selectedStudent = mockStudents.find((s) => s.id === selectedStudentId);
  const quickViewStudent = mockStudents.find((s) => s.id === quickViewStudentId);

  if (selectedStudent) {
    return <StudentDetail student={selectedStudent} onBack={() => setSelectedStudentId(null)} />;
  }

  return (
    <div className="px-3 py-3 sm:p-6 animate-in fade-in duration-300 w-full box-border">
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full box-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#6B6B6B' }} />
            <Input
              placeholder="Search by name or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E3E3E3',
                color: '#2C2C2C',
              }}
            />
          </div>
          
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
              <SelectValue placeholder="Grade Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="9th Grade">9th Grade</SelectItem>
              <SelectItem value="10th Grade">10th Grade</SelectItem>
              <SelectItem value="11th Grade">11th Grade</SelectItem>
              <SelectItem value="12th Grade">12th Grade</SelectItem>
            </SelectContent>
          </Select>

          <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
            <SelectTrigger className="w-full" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="needs-improvement">Needs Improvement</SelectItem>
            </SelectContent>
          </Select>

          <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
            <SelectTrigger className="w-full" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
              <SelectValue placeholder="Enrollment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredStudents.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            onClick={() => setSelectedStudentId(student.id)}
            onQuickView={(e) => {
              e.stopPropagation();
              setQuickViewStudentId(student.id);
            }}
          />
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: '#6B6B6B' }}>No students found matching your criteria.</p>
        </div>
      )}

      {quickViewStudent && (
        <StudentQuickView
          student={quickViewStudent}
          open={!!quickViewStudentId}
          onClose={() => setQuickViewStudentId(null)}
        />
      )}
    </div>
  );
}
