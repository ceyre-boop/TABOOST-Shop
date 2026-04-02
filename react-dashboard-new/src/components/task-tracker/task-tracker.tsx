import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockTasks, Task, TaskComment } from '@/lib/mock-data';
import { Calendar, MessageSquare, AlertCircle, CheckSquare, Clock, ListTodo, AlertTriangle } from 'lucide-react';
import { theme } from '@/lib/theme';

const STORAGE_KEY = 'task_comments';
const DUE_DATES_KEY = 'task_due_dates';

export function TaskTracker() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});
  const [newComment, setNewComment] = useState<string>('');
  const [taskDueDates, setTaskDueDates] = useState<Record<string, string>>({});
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTaskComments(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored comments', e);
      }
    }

    const storedDates = localStorage.getItem(DUE_DATES_KEY);
    if (storedDates) {
      try {
        setTaskDueDates(JSON.parse(storedDates));
      } catch (e) {
        console.error('Failed to parse stored due dates', e);
      }
    }
  }, []);

  const getTaskComments = (taskId: string): TaskComment[] => {
    const baseComments = mockTasks.find(t => t.id === taskId)?.comments || [];
    const additionalComments = taskComments[taskId] || [];
    return [...baseComments, ...additionalComments];
  };

  const handleSendComment = () => {
    if (!newComment.trim() || !selectedTask) return;

    const comment: TaskComment = {
      id: `${selectedTask.id}-COMMENT-${Date.now()}`,
      author: 'Current User',
      text: newComment.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = {
      ...taskComments,
      [selectedTask.id]: [...(taskComments[selectedTask.id] || []), comment],
    };

    setTaskComments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewComment('');
  };

  const getTaskDueDate = (taskId: string): string => {
    return taskDueDates[taskId] || mockTasks.find(t => t.id === taskId)?.dueDate || '';
  };

  const handleEditDueDate = () => {
    if (!selectedTask) return;
    setIsEditingDueDate(true);
    setEditedDueDate(getTaskDueDate(selectedTask.id));
  };

  const handleSaveDueDate = () => {
    if (!selectedTask || !editedDueDate) return;

    const updated = {
      ...taskDueDates,
      [selectedTask.id]: editedDueDate,
    };

    setTaskDueDates(updated);
    localStorage.setItem(DUE_DATES_KEY, JSON.stringify(updated));
    setIsEditingDueDate(false);

    const isPastDue = new Date(editedDueDate) < new Date();
    let newStatus: Task['status'] = selectedTask.status;
    
    if (isPastDue && selectedTask.progress < 100) {
      newStatus = 'overdue';
    } else if (!isPastDue && selectedTask.status === 'overdue' && selectedTask.progress > 0 && selectedTask.progress < 100) {
      newStatus = 'in-progress';
    } else if (!isPastDue && selectedTask.status === 'overdue' && selectedTask.progress === 0) {
      newStatus = 'pending';
    }

    setSelectedTask({
      ...selectedTask,
      dueDate: editedDueDate,
      status: newStatus,
    });
  };

  const handleCancelEditDueDate = () => {
    setIsEditingDueDate(false);
    setEditedDueDate('');
  };

  const getTaskWithUpdatedStatus = (task: Task): Task => {
    const taskDueDate = getTaskDueDate(task.id);
    const isPastDue = new Date(taskDueDate) < new Date();
    
    let status: Task['status'] = task.status;
    if (isPastDue && task.progress < 100) {
      status = 'overdue';
    }
    
    return { ...task, status, dueDate: taskDueDate };
  };

  const tasksWithUpdatedData = mockTasks.map(getTaskWithUpdatedStatus);

  const filteredTasks = tasksWithUpdatedData.filter((task) => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const totalTasks = tasksWithUpdatedData.length;
  const inProgressTasks = tasksWithUpdatedData.filter(t => t.status === 'in-progress').length;
  const completedTasks = tasksWithUpdatedData.filter(t => t.status === 'completed').length;
  const overdueTasks = tasksWithUpdatedData.filter(t => t.status === 'overdue').length;

  const getStatusBadgeClass = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return { bg: '#E8F3EC', text: theme.colors.success };
      case 'in-progress':
        return { bg: '#E8EDF3', text: theme.colors.complement };
      case 'pending':
        return { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
      case 'overdue':
        return { bg: '#FCEAEA', text: theme.colors.error };
    }
  };

  const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return { bg: '#FCEAEA', text: theme.colors.error };
      case 'medium':
        return { bg: '#FFF4E6', text: theme.colors.warning };
      case 'low':
        return { bg: theme.colors.chartBg, text: theme.colors.secondaryText };
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="px-3 py-3 sm:p-6 animate-in fade-in duration-300 w-full box-border">
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:max-w-2xl">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Total Tasks</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{totalTasks}</p>
              </div>
              <ListTodo className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.accent }} />
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>In Progress</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{inProgressTasks}</p>
              </div>
              <Clock className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.complement }} />
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Completed</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{completedTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.success }} />
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm mb-1" style={{ color: theme.colors.secondaryText }}>Overdue</p>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.primaryText }}>{overdueTasks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: theme.colors.error }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredTasks.map((task) => {
          const taskDueDate = getTaskDueDate(task.id);
          const daysUntilDue = getDaysUntilDue(taskDueDate);
          const isUrgent = daysUntilDue <= 3 && task.status !== 'completed';
          const statusBadge = getStatusBadgeClass(task.status);
          const priorityBadge = getPriorityBadgeClass(task.priority);

          return (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 duration-300" 
              onClick={() => setSelectedTask(task)}
              style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
            >
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base line-clamp-2" style={{ color: theme.colors.primaryText }}>{task.title}</CardTitle>
                </div>
                <div className="flex gap-1 sm:gap-2 mt-2">
                  <Badge style={{ backgroundColor: priorityBadge.bg, color: priorityBadge.text, border: 'none', fontSize: '0.65rem', padding: '2px 6px' }}>
                    {task.priority}
                  </Badge>
                  <Badge style={{ backgroundColor: statusBadge.bg, color: statusBadge.text, border: 'none', fontSize: '0.65rem', padding: '2px 6px' }}>
                    {task.status === 'in-progress' ? 'in progress' : task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <p className="text-xs mb-2 sm:mb-3 line-clamp-2" style={{ color: theme.colors.secondaryText }}>{task.description}</p>

                <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                      <AvatarFallback style={{ backgroundColor: '#E8F3EC', color: theme.colors.accent, fontSize: '0.5rem' }}>
                        {getInitials(task.assignee)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium text-xs" style={{ color: theme.colors.primaryText }}>{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                    <span className="font-medium" style={{ color: isUrgent ? theme.colors.error : theme.colors.primaryText }}>
                      {new Date(taskDueDate).toLocaleDateString()}
                      {isUrgent && <AlertCircle className="inline ml-1 h-3 w-3" />}
                    </span>
                  </div>
                  {daysUntilDue >= 0 && task.status !== 'completed' && (
                    <div className="text-xs" style={{ color: theme.colors.secondaryText }}>
                      {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days left`}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: theme.colors.primaryText }}>Progress</span>
                    <span className="text-xs font-semibold" style={{ color: theme.colors.primaryText }}>{task.progress}%</span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                    <div
                      className="h-full transition-all"
                      style={{ backgroundColor: theme.colors.accent, width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" onClick={() => setSelectedTask(null)}>
          <Card className="max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base sm:text-lg pr-2" style={{ color: theme.colors.primaryText }}>{selectedTask.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)} className="flex-shrink-0 h-8 w-8 p-0" style={{ color: theme.colors.secondaryText }}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex gap-2">
                {(() => {
                  const priorityBadge = getPriorityBadgeClass(selectedTask.priority);
                  const statusBadge = getStatusBadgeClass(selectedTask.status);
                  return (
                    <>
                      <Badge style={{ backgroundColor: priorityBadge.bg, color: priorityBadge.text, border: 'none' }}>
                        {selectedTask.priority}
                      </Badge>
                      <Badge style={{ backgroundColor: statusBadge.bg, color: statusBadge.text, border: 'none' }}>
                        {selectedTask.status}
                      </Badge>
                    </>
                  );
                })()}
              </div>

              <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: theme.colors.primaryText }}>{selectedTask.description}</p>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarFallback style={{ backgroundColor: '#E8F3EC', color: theme.colors.accent }}>
                      {getInitials(selectedTask.assignee)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>{selectedTask.assignee}</p>
                    <p className="text-xs" style={{ color: theme.colors.secondaryText }}>Assignee</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: theme.colors.secondaryText }} />
                  {isEditingDueDate ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        type="date"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                        className="h-7 text-xs sm:text-sm"
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleSaveDueDate}
                        className="h-7 px-2 text-xs whitespace-nowrap"
                        style={{ backgroundColor: theme.colors.accent, color: theme.colors.surface }}
                      >
                        Save
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={handleCancelEditDueDate}
                        className="h-7 px-2 text-xs whitespace-nowrap"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm" style={{ color: theme.colors.primaryText }}>Due: {new Date(getTaskDueDate(selectedTask.id)).toLocaleDateString()}</span>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={handleEditDueDate}
                        className="h-6 px-2 text-xs whitespace-nowrap"
                        style={{ color: theme.colors.accent }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.primaryText }}>Progress</span>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: theme.colors.primaryText }}>{selectedTask.progress}%</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <div
                    className="h-full transition-all"
                    style={{ backgroundColor: theme.colors.accent, width: `${selectedTask.progress}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2" style={{ color: theme.colors.primaryText }}>
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: theme.colors.accent }} />
                  Team Collaboration
                </h4>
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                  {getTaskComments(selectedTask.id).map((comment) => {
                    const timeAgo = () => {
                      const now = new Date();
                      const commentTime = new Date(comment.timestamp);
                      const diffMs = now.getTime() - commentTime.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffHours / 24);
                      
                      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                      return 'Just now';
                    };

                    return (
                      <div key={comment.id} className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: theme.colors.chartBg }}>
                        <div className="flex items-start gap-2 mb-1">
                          <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                            <AvatarFallback style={{ backgroundColor: '#F0EDF5', color: theme.colors.accent }} className="text-[0.6rem]">
                              {comment.author.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium truncate" style={{ color: theme.colors.primaryText }}>{comment.author}</p>
                              <p className="text-xs" style={{ color: theme.colors.secondaryText }}>{timeAgo()}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm ml-7 sm:ml-8" style={{ color: theme.colors.primaryText }}>{comment.text}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} 
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    style={{ backgroundColor: theme.colors.accent, color: theme.colors.surface }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
