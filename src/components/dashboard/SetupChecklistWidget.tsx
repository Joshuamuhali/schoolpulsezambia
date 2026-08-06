import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, GraduationCap, Users, BookOpen, UserCheck, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SetupTask {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  completed: boolean;
}

const SetupChecklistWidget = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<SetupTask[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    loadSetupStatus();
  }, []);

  const loadSetupStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's school
      const { data: memberData } = await (supabase as any)
        .from('school_members')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData?.school_id) return;

      setSchoolId(memberData.school_id);

      // Check setup completion status
      const [
        gradesRes,
        classesRes,
        subjectsRes,
        teachersRes,
        studentsRes,
      ] = await Promise.all([
        supabase.from('grades').select('id', { count: 'exact', head: true }).eq('school_id', memberData.school_id),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', memberData.school_id),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', memberData.school_id),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('school_id', memberData.school_id),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', memberData.school_id),
      ]);

      const hasGrades = (gradesRes.count || 0) > 0;
      const hasClasses = (classesRes.count || 0) > 0;
      const hasSubjects = (subjectsRes.count || 0) > 0;
      const hasTeachers = (teachersRes.count || 0) > 0;
      const hasStudents = (studentsRes.count || 0) > 0;

      const setupTasks: SetupTask[] = [
        {
          id: 'grades',
          title: 'Add Grades',
          description: 'Set up grade levels for your school',
          icon: <GraduationCap className="h-5 w-5" />,
          route: '/dashboard/setup/grades',
          completed: hasGrades,
        },
        {
          id: 'classes',
          title: 'Create Classes',
          description: 'Create classes for each grade',
          icon: <BookOpen className="h-5 w-5" />,
          route: '/dashboard/setup/classes',
          completed: hasClasses,
        },
        {
          id: 'subjects',
          title: 'Add Subjects',
          description: 'Define subjects for each grade',
          icon: <BookOpen className="h-5 w-5" />,
          route: '/dashboard/setup/subjects',
          completed: hasSubjects,
        },
        {
          id: 'teachers',
          title: 'Add Teachers',
          description: 'Invite and add teachers to your school',
          icon: <UserCheck className="h-5 w-5" />,
          route: '/dashboard/staff',
          completed: hasTeachers,
        },
        {
          id: 'students',
          title: 'Add Students',
          description: 'Enroll students in your school',
          icon: <UserPlus className="h-5 w-5" />,
          route: '/dashboard/students',
          completed: hasStudents,
        },
      ];

      setTasks(setupTasks);
    } catch (err) {
      console.error('[SetupChecklist] Error loading setup status:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  const handleTaskClick = (task: SetupTask) => {
    if (task.completed) {
      toast.info('This step is already completed');
      return;
    }
    navigate(task.route);
  };

  if (loading) {
    return null;
  }

  // If all tasks are complete, don't show the widget
  if (isComplete) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Complete Your School Setup
            </CardTitle>
            <CardDescription className="mt-1">
              Get your school ready for the new academic year
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {completedCount}/{totalCount}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
        <Progress value={progressPercentage} className="mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                task.completed
                  ? 'bg-green-50 border-green-200 opacity-75'
                  : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
              }`}
            >
              <div className={`mt-0.5 ${task.completed ? 'text-green-600' : 'text-gray-400'}`}>
                {task.completed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${task.completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </span>
                  {task.icon}
                </div>
                <p className={`text-sm mt-1 ${task.completed ? 'text-green-700' : 'text-gray-500'}`}>
                  {task.description}
                </p>
              </div>
              {!task.completed && (
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {!isComplete && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Complete these setup steps to unlock all features. You can always access these settings later from the sidebar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SetupChecklistWidget;