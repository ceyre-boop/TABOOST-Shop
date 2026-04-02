import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { generateProgressData } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { theme } from '@/lib/theme';

interface SubjectDrillDownProps {
  subject: string;
  open: boolean;
  onClose: () => void;
}

export function SubjectDrillDown({ subject, open, onClose }: SubjectDrillDownProps) {
  const progressData = generateProgressData();
  const subjectData = progressData.map(d => ({
    term: d.term,
    score: d[subject],
  }));

  const avgScore = Math.round(subjectData.reduce((sum, d) => sum + d.score, 0) / subjectData.length);
  const latestScore = subjectData[subjectData.length - 1].score;
  const trend = latestScore - subjectData[0].score;

  const detailedMetrics = [
    { label: 'Assignments', score: Math.floor(70 + Math.random() * 30), count: 12 },
    { label: 'Tests', score: Math.floor(70 + Math.random() * 30), count: 4 },
    { label: 'Projects', score: Math.floor(70 + Math.random() * 30), count: 3 },
    { label: 'Participation', score: Math.floor(70 + Math.random() * 30), count: 1 },
  ];

  const getPerformanceBadgeStyle = (score: number) => {
    if (score >= 85) return { label: 'Strong', bg: '#E8F3EC', text: theme.colors.success };
    if (score >= 70) return { label: 'Good', bg: '#FFF4E6', text: theme.colors.warning };
    return { label: 'Needs Work', bg: '#FCEAEA', text: theme.colors.error };
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
          <p className="font-semibold" style={{ color: theme.colors.primaryText }}>{payload[0].payload.term || payload[0].payload.label}</p>
          <p className="text-sm" style={{ color: theme.colors.accent }}>
            Score: {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: theme.colors.primaryText }}>{subject} - Detailed Analysis</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardContent className="p-6">
                <p className="text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Average Score</p>
                <p className="text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{avgScore}%</p>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardContent className="p-6">
                <p className="text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Latest Score</p>
                <p className="text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{latestScore}%</p>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardContent className="p-6">
                <p className="text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Trend</p>
                <p className={`text-3xl font-bold`} style={{ color: trend >= 0 ? theme.colors.success : theme.colors.error }}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.chartGrid} />
                  <XAxis dataKey="term" stroke={theme.colors.secondaryText} />
                  <YAxis domain={[60, 100]} stroke={theme.colors.secondaryText} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke={theme.colors.accent} strokeWidth={3} dot={{ r: 6, fill: theme.colors.accent }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={detailedMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.chartGrid} />
                  <XAxis dataKey="label" stroke={theme.colors.secondaryText} />
                  <YAxis domain={[0, 100]} stroke={theme.colors.secondaryText} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" fill={theme.colors.accent} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.primaryText }}>Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {detailedMetrics.map((metric) => {
                  const badgeStyle = getPerformanceBadgeStyle(metric.score);
                  return (
                    <div 
                      key={metric.label} 
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: theme.colors.chartBg }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: theme.colors.primaryText }}>{metric.label}</p>
                        <p className="text-sm" style={{ color: theme.colors.secondaryText }}>{metric.count} completed</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: theme.colors.primaryText }}>{metric.score}%</span>
                        <Badge style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: 'none' }}>
                          {badgeStyle.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
