export interface Student {
  id: string;
  name: string;
  studentId: string;
  gradeLevel: string;
  enrollmentStatus: 'active' | 'inactive' | 'graduated' | 'suspended';
  performanceStatus: 'excellent' | 'good' | 'needs-improvement';
  email: string;
  phone: string;
  gpa: number;
  attendance: number;
  joinDate: string;
  photoUrl: string;
}

export interface AcademicRecord {
  id: string;
  subject: string;
  term: string;
  grade: string;
  score: number;
  credits: number;
  teacher: string;
}

export interface ParticipationRecord {
  id: string;
  activity: string;
  type: 'club' | 'sport' | 'academic' | 'volunteer';
  role: string;
  hoursContributed: number;
  status: 'active' | 'completed';
}

export interface ActivityHistory {
  id: string;
  date: string;
  action: string;
  description: string;
  category: 'academic' | 'attendance' | 'behavior' | 'achievement';
}

export interface Program {
  id: string;
  name: string;
  type: 'curriculum' | 'enrollment' | 'training';
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  description: string;
  startDate: string;
  endDate: string;
  participants: number;
  progress: number;
  coordinator: string;
  milestones: ProgramMilestone[];
}

export interface ProgramMilestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string;
  progress: number;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

const femaleNames = ['Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn'];
const maleNames = ['Liam', 'Noah', 'Ethan', 'Mason', 'William', 'James', 'Benjamin', 'Lucas', 'Henry', 'Alexander'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const gradeLevels = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const enrollmentStatuses: Student['enrollmentStatus'][] = ['active', 'active', 'active', 'active', 'inactive', 'graduated'];
const performanceStatuses: Student['performanceStatus'][] = ['excellent', 'good', 'needs-improvement'];

const femalePhotoIds = [1, 2, 5, 8, 9, 10, 12, 13, 16, 19, 20, 24, 25, 26, 28, 29, 31, 32, 40, 41, 43, 44, 45, 47, 49, 52, 53, 58, 60, 62, 65, 67, 68, 69, 71, 72, 75, 78, 79, 80, 81, 82, 83, 85, 88, 90, 91, 94, 95, 96];
const malePhotoIds = [1, 3, 5, 7, 11, 12, 14, 15, 18, 19, 20, 22, 24, 25, 27, 31, 32, 33, 36, 40, 41, 43, 45, 48, 51, 52, 54, 56, 57, 59, 60, 63, 65, 67, 69, 71, 73, 75, 77, 78, 81, 83, 85, 86, 88, 91, 92, 94, 97, 98];

export const mockStudents: Student[] = Array.from({ length: 50 }, (_, i) => {
  const isFemale = i % 2 === 0;
  const firstName = isFemale 
    ? femaleNames[Math.floor(Math.random() * femaleNames.length)]
    : maleNames[Math.floor(Math.random() * maleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const gpa = parseFloat((2.0 + Math.random() * 2.0).toFixed(2));
  
  let performanceStatus: Student['performanceStatus'];
  if (gpa >= 3.5) performanceStatus = 'excellent';
  else if (gpa >= 2.8) performanceStatus = 'good';
  else performanceStatus = 'needs-improvement';

  const photoIds = isFemale ? femalePhotoIds : malePhotoIds;
  const photoId = photoIds[i % photoIds.length];

  return {
    id: `STU-${(i + 1).toString().padStart(4, '0')}`,
    name,
    studentId: `${(100000 + i).toString()}`,
    gradeLevel: gradeLevels[Math.floor(Math.random() * gradeLevels.length)],
    enrollmentStatus: enrollmentStatuses[Math.floor(Math.random() * enrollmentStatuses.length)],
    performanceStatus,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.edu`,
    phone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
    gpa,
    attendance: Math.floor(75 + Math.random() * 25),
    joinDate: `202${Math.floor(Math.random() * 4)}-09-01`,
    photoUrl: `https://randomuser.me/api/portraits/${isFemale ? 'women' : 'men'}/${photoId}.jpg`,
  };
});

const subjects = ['Mathematics', 'English Literature', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science'];
const terms = ['Fall 2023', 'Spring 2024', 'Fall 2024'];
const teachers = ['Dr. Anderson', 'Prof. Martinez', 'Ms. Johnson', 'Mr. Williams', 'Dr. Brown'];

export function generateAcademicRecords(studentId: string): AcademicRecord[] {
  return subjects.flatMap((subject, idx) => 
    terms.map((term, termIdx) => {
      const score = Math.floor(65 + Math.random() * 35);
      let grade: string;
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'F';

      return {
        id: `${studentId}-${idx}-${termIdx}`,
        subject,
        term,
        grade,
        score,
        credits: 3,
        teacher: teachers[Math.floor(Math.random() * teachers.length)],
      };
    })
  );
}

const activities = ['Math Club', 'Chess Club', 'Debate Team', 'Soccer Team', 'Basketball Team', 'Science Olympiad', 'Community Service', 'Drama Club'];
const activityTypes: ParticipationRecord['type'][] = ['club', 'sport', 'academic', 'volunteer'];
const roles = ['Member', 'Captain', 'Vice President', 'President', 'Volunteer'];

export function generateParticipationRecords(studentId: string): ParticipationRecord[] {
  const count = Math.floor(2 + Math.random() * 4);
  return Array.from({ length: count }, (_, i) => ({
    id: `${studentId}-PAR-${i}`,
    activity: activities[Math.floor(Math.random() * activities.length)],
    type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
    role: roles[Math.floor(Math.random() * roles.length)],
    hoursContributed: Math.floor(10 + Math.random() * 90),
    status: Math.random() > 0.3 ? 'active' : 'completed',
  }));
}

const actions = ['Enrolled in course', 'Submitted assignment', 'Attended event', 'Received award', 'Missed class', 'Completed project'];
const categories: ActivityHistory['category'][] = ['academic', 'attendance', 'behavior', 'achievement'];

export function generateActivityHistory(studentId: string): ActivityHistory[] {
  const count = Math.floor(10 + Math.random() * 20);
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `${studentId}-ACT-${i}`,
      date: date.toISOString().split('T')[0],
      action: actions[Math.floor(Math.random() * actions.length)],
      description: `Student ${actions[Math.floor(Math.random() * actions.length)].toLowerCase()} on ${date.toLocaleDateString()}`,
      category: categories[Math.floor(Math.random() * categories.length)],
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateMilestones(startDate: string, endDate: string): ProgramMilestone[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const milestoneCount = Math.min(5, Math.floor(totalDays / 30));
  
  return Array.from({ length: milestoneCount }, (_, i) => {
    const milestoneDate = new Date(start);
    milestoneDate.setDate(start.getDate() + Math.floor((totalDays / milestoneCount) * i));
    const isCompleted = milestoneDate < new Date();
    
    return {
      id: `milestone-${i}`,
      title: ['Kickoff Meeting', 'Phase 1 Complete', 'Mid-point Review', 'Phase 2 Complete', 'Final Review'][i] || `Milestone ${i + 1}`,
      date: milestoneDate.toISOString().split('T')[0],
      completed: isCompleted,
    };
  });
}

export const mockPrograms: Program[] = [
  {
    id: 'PROG-001',
    name: 'Advanced Mathematics Curriculum',
    type: 'curriculum',
    status: 'active',
    description: 'Development of advanced mathematics curriculum for grades 11-12',
    startDate: '2024-01-15',
    endDate: '2024-12-31',
    participants: 45,
    progress: 65,
    coordinator: 'Dr. Anderson',
    milestones: generateMilestones('2024-01-15', '2024-12-31'),
  },
  {
    id: 'PROG-002',
    name: 'Spring 2025 Enrollment',
    type: 'enrollment',
    status: 'active',
    description: 'Student enrollment process for Spring 2025 semester',
    startDate: '2024-10-01',
    endDate: '2024-12-15',
    participants: 320,
    progress: 78,
    coordinator: 'Ms. Johnson',
    milestones: generateMilestones('2024-10-01', '2024-12-15'),
  },
  {
    id: 'PROG-003',
    name: 'Teacher Professional Development',
    type: 'training',
    status: 'active',
    description: 'Quarterly training program for teaching staff on modern pedagogical methods',
    startDate: '2024-09-01',
    endDate: '2024-11-30',
    participants: 28,
    progress: 82,
    coordinator: 'Prof. Martinez',
    milestones: generateMilestones('2024-09-01', '2024-11-30'),
  },
  {
    id: 'PROG-004',
    name: 'Science Lab Modernization',
    type: 'curriculum',
    status: 'planning',
    description: 'Planning phase for updating science laboratory equipment and curriculum',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    participants: 12,
    progress: 15,
    coordinator: 'Dr. Brown',
    milestones: generateMilestones('2025-01-01', '2025-06-30'),
  },
  {
    id: 'PROG-005',
    name: 'Fall 2024 Enrollment',
    type: 'enrollment',
    status: 'completed',
    description: 'Completed enrollment process for Fall 2024 semester',
    startDate: '2024-04-01',
    endDate: '2024-08-31',
    participants: 298,
    progress: 100,
    coordinator: 'Ms. Johnson',
    milestones: generateMilestones('2024-04-01', '2024-08-31'),
  },
  {
    id: 'PROG-006',
    name: 'Digital Literacy Workshop',
    type: 'training',
    status: 'on-hold',
    description: 'Workshop series on digital tools and online teaching methods',
    startDate: '2024-08-15',
    endDate: '2024-10-15',
    participants: 15,
    progress: 40,
    coordinator: 'Mr. Williams',
    milestones: generateMilestones('2024-08-15', '2024-10-15'),
  },
];

const taskTitles = [
  'Review student applications for fall semester',
  'Prepare quarterly performance report',
  'Update course materials for next term',
  'Schedule parent-teacher conferences',
  'Grade midterm examination papers',
  'Organize educational field trip',
  'Submit annual budget proposal',
  'Conduct teacher performance evaluation',
  'Update student academic records',
  'Plan graduation ceremony logistics',
  'Develop new curriculum guidelines',
  'Coordinate student orientation program',
  'Review and approve scholarship applications',
  'Organize professional development workshop',
  'Update school website content',
  'Prepare accreditation documentation',
  'Conduct facility safety inspection',
  'Plan end-of-year celebration event',
  'Review textbook procurement requests',
  'Coordinate standardized testing schedule',
  'Update student handbook policies',
  'Organize parent engagement activities',
  'Review enrollment projection data',
  'Coordinate extracurricular activities',
  'Prepare board meeting presentation',
];

const coordinators = ['Dr. Anderson', 'Prof. Martinez', 'Ms. Johnson', 'Mr. Williams', 'Dr. Brown'];

const commentTemplates = [
  'Great progress on this task. Let me know if you need any support.',
  'I reviewed the initial draft and it looks promising. A few minor adjustments needed.',
  'Can we schedule a quick meeting to discuss the next steps?',
  'Excellent work! The attention to detail is impressive.',
  'I have some concerns about the timeline. Let\'s discuss this further.',
  'The stakeholders are very pleased with the progress so far.',
  'I\'ve shared some additional resources that might be helpful.',
  'Could you provide an update on the current status?',
  'This is moving along nicely. Keep up the good work!',
  'I noticed a few issues that need to be addressed before we proceed.',
  'Let\'s aim to complete this by end of week if possible.',
  'The team is impressed with your approach to this task.',
  'I\'ve added some comments in the document for your review.',
  'We should align with the other departments on this.',
  'This looks ready for final review. Great job!',
  'Can you clarify the approach you\'re taking here?',
  'I\'ve approved the budget allocation for this task.',
  'The preliminary results look very encouraging.',
  'Let\'s make sure all stakeholders are kept in the loop.',
  'I suggest we prioritize this given the upcoming deadline.',
];

function generateTaskComments(taskId: string, coordinatorsList: string[]): TaskComment[] {
  const commentCount = Math.floor(Math.random() * 3) + 1;
  const usedTemplates = new Set<number>();
  const comments: TaskComment[] = [];
  
  for (let i = 0; i < commentCount; i++) {
    let templateIndex;
    do {
      templateIndex = Math.floor(Math.random() * commentTemplates.length);
    } while (usedTemplates.has(templateIndex));
    usedTemplates.add(templateIndex);
    
    const hoursAgo = Math.floor(Math.random() * 48) + 1;
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    
    comments.push({
      id: `${taskId}-COMMENT-${i}`,
      author: coordinatorsList[Math.floor(Math.random() * coordinatorsList.length)],
      text: commentTemplates[templateIndex],
      timestamp: timestamp.toISOString(),
    });
  }
  
  return comments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export const mockTasks: Task[] = taskTitles.map((title, i) => {
  const daysOffset = Math.floor(Math.random() * 60) - 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysOffset);
  
  const isPastDue = dueDate < new Date();
  const progress = Math.floor(Math.random() * 100);
  
  let status: Task['status'];
  if (isPastDue && progress < 100) status = 'overdue';
  else if (progress === 100) status = 'completed';
  else if (progress > 0) status = 'in-progress';
  else status = 'pending';

  const taskId = `TASK-${(i + 1).toString().padStart(3, '0')}`;
  
  const descriptions = [
    'Ensure all required documentation is submitted and reviewed according to institutional standards.',
    'Compile comprehensive data analysis and insights for stakeholder review.',
    'Review and refresh educational materials to align with latest curriculum standards.',
    'Arrange meetings between educators and families to discuss student progress.',
    'Evaluate student performance and provide detailed feedback on assessments.',
    'Plan and coordinate educational excursion with proper safety protocols.',
    'Prepare detailed financial projections and resource allocation plans.',
    'Assess teaching effectiveness and provide constructive feedback for improvement.',
    'Maintain accurate and up-to-date information in the student management system.',
    'Coordinate all aspects of the commencement ceremony for graduating class.',
    'Create comprehensive educational framework for program implementation.',
    'Organize welcoming activities for new students joining the institution.',
    'Evaluate financial aid applications based on established criteria.',
    'Facilitate skill enhancement sessions for faculty members.',
    'Ensure online presence reflects current programs and institutional updates.',
    'Gather and organize required materials for institutional review process.',
    'Perform comprehensive safety assessment of school facilities.',
    'Organize celebratory activities to recognize achievements and milestones.',
    'Evaluate educational resource needs and vendor proposals.',
    'Organize logistics for district-wide academic assessments.',
    'Revise institutional policies to reflect current educational practices.',
    'Plan activities to strengthen relationships between school and families.',
    'Analyze demographic trends to inform strategic planning.',
    'Schedule and supervise non-academic student programs and clubs.',
    'Create comprehensive overview for governance committee meeting.',
  ];

  return {
    id: taskId,
    title,
    description: descriptions[i],
    status,
    priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Task['priority'],
    assignee: coordinators[Math.floor(Math.random() * coordinators.length)],
    dueDate: dueDate.toISOString().split('T')[0],
    progress,
    comments: generateTaskComments(taskId, coordinators),
  };
});

export function generateProgressData() {
  return terms.map((term, idx) => {
    const data: any = { term };
    subjects.forEach((subject) => {
      data[subject] = Math.floor(70 + Math.random() * 25);
    });
    return data;
  });
}
