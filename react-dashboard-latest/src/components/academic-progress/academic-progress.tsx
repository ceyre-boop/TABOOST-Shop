import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateProgressData, mockStudents } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { SubjectDrillDown } from './subject-drill-down';

export function AcademicProgress() {
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [drillDownSubject, setDrillDownSubject] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('subject');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const progressData = generateProgressData();
  const subjects = ['Mathematics', 'English Literature', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science'];

  const subjectColors = [
    '#7BA68C',
    '#6C7C9B',
    '#E0A25B',
    '#5BB46C',
    '#D75B5B',
    '#61846F',
    '#8B9DC3',
    '#C4956D',
  ];

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return '#5BB46C';
    if (score >= 70) return '#6C7C9B';
    return '#D75B5B';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 85) return { label: 'Strength', bg: '#E8F3EC', text: '#5BB46C' };
    if (score >= 70) return { label: 'Average', bg: '#FFF4E6', text: '#E0A25B' };
    return { label: 'Gap', bg: '#FCEAEA', text: '#D75B5B' };
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (sortColumn === 'subject') {
      return sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    } else {
      const aScore = progressData[progressData.length - 1][a];
      const bScore = progressData[progressData.length - 1][b];
      return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
    }
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E3E3E3' }}>
          <p className="font-semibold" style={{ color: '#2C2C2C' }}>{payload[0].payload.term}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-3 py-3 sm:p-6 animate-in fade-in duration-300 w-full box-border">
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:max-w-2xl w-full box-border">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
              <SelectValue placeholder="Select Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {mockStudents.slice(0, 10).map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3' }}>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card className="transition-shadow duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <CardHeader>
            <CardTitle style={{ color: '#2C2C2C' }}>Performance Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                <XAxis dataKey="term" stroke="#6B6B6B" />
                <YAxis domain={[60, 100]} stroke="#6B6B6B" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {subjects.map((subject, idx) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={subjectColors[idx]}
                    strokeWidth={2}
                    dot={{ r: 4, fill: subjectColors[idx] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <CardHeader>
            <CardTitle style={{ color: '#2C2C2C' }}>Subject Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {subjects.map((subject) => {
                const latestScore = progressData[progressData.length - 1][subject];
                const badge = getPerformanceBadge(latestScore);
                return (
                  <div 
                    key={subject} 
                    className="flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm sm:text-base font-medium truncate" style={{ color: '#2C2C2C' }}>{subject}</p>
                      <div className="w-full rounded-full h-2 mt-1 overflow-hidden" style={{ backgroundColor: '#F2F2F2' }}>
                        <div
                          className="h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ backgroundColor: '#7BA68C', width: `${latestScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold" style={{ color: getPerformanceColor(latestScore) }}>
                        {latestScore}%
                      </span>
                      <Badge style={{ backgroundColor: badge.bg, color: badge.text, border: 'none' }}>
                        {badge.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-shadow duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E3E3', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <CardHeader>
          <CardTitle style={{ color: '#2C2C2C' }}>Term Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #E3E3E3' }}>
                  <th 
                    className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => handleSort('subject')}
                    style={{ color: '#2C2C2C' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F2F2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Subject {sortColumn === 'subject' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: '#2C2C2C' }}>Fall 2023</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: '#2C2C2C' }}>Spring 2024</th>
                  <th 
                    className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => handleSort('latest')}
                    style={{ color: '#2C2C2C' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F2F2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Fall 2024 {sortColumn === 'latest' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: '#2C2C2C' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubjects.map((subject, idx) => {
                  const scores = progressData.map(d => d[subject]);
                  const trend = scores[scores.length - 1] - scores[0];
                  return (
                    <tr 
                      key={subject} 
                      className="transition-colors cursor-pointer"
                      style={{ 
                        borderBottom: '1px solid #E3E3E3',
                        backgroundColor: idx % 2 === 0 ? '#FAFAF8' : '#FFFFFF',
                      }}
                      onClick={() => setDrillDownSubject(subject)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F6F4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FAFAF8' : '#FFFFFF';
                      }}
                    >
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: '#2C2C2C' }}>{subject}</td>
                      {scores.map((score, idx) => (
                        <td key={idx} className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          <span style={{ color: getPerformanceColor(score) }}>{score}%</span>
                        </td>
                      ))}
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                        <span style={{ color: trend >= 0 ? '#5BB46C' : '#D75B5B' }}>
                          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {drillDownSubject && (
        <SubjectDrillDown
          subject={drillDownSubject}
          open={!!drillDownSubject}
          onClose={() => setDrillDownSubject(null)}
        />
      )}
    </div>
  );
}
