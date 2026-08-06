import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  DollarSign,
  MessageSquare,
  Clock,
  UserCircle,
  BarChart3,
  Shield,
  Target,
  Heart,
  Lightbulb,
  Lock,
} from "lucide-react";

const outcomeModules = [
  {
    title: "Student Journey",
    description:
      "Every learner deserves a complete, organized academic journey—from admission through graduation.",
    icon: Users,
    keywords: "student management, admissions, enrollment, academic records",
  },
  {
    title: "Teacher Success",
    description:
      "Give educators the tools they need to manage classrooms efficiently and focus on teaching.",
    icon: GraduationCap,
    keywords: "teacher management, classroom, educator tools",
  },
  {
    title: "Attendance & Engagement",
    description:
      "Understand attendance trends, improve accountability, and keep families informed.",
    icon: UserCheck,
    keywords: "attendance tracking, student engagement, parent notifications",
  },
  {
    title: "Assessment & Growth",
    description:
      "Transform assessments into meaningful insights that support better learning outcomes.",
    icon: Target,
    keywords: "exams, grading, report cards, academic performance",
  },
  {
    title: "Financial Confidence",
    description:
      "Manage school finances with greater visibility, accountability, and control.",
    icon: DollarSign,
    keywords: "school fees, billing, payment tracking, financial reports",
  },
  {
    title: "Connected Communication",
    description:
      "Bring school leaders, teachers, parents, and students together through timely communication.",
    icon: MessageSquare,
    keywords: "announcements, notifications, parent-teacher messaging",
  },
  {
    title: "Smarter Scheduling",
    description:
      "Create organized school timetables that keep learning running smoothly.",
    icon: Clock,
    keywords: "timetable, scheduling, class management",
  },
  {
    title: "Parent Partnership",
    description:
      "Help families stay informed, engaged, and connected throughout their child's education.",
    icon: Heart,
    keywords: "parent portal, family engagement, student progress",
  },
  {
    title: "Leadership Insights",
    description:
      "Turn school data into clear insights that support confident decision-making.",
    icon: Lightbulb,
    keywords: "analytics, dashboards, school performance, data insights",
  },
  {
    title: "Secure Foundation",
    description:
      "Protect your school's information with enterprise-grade security built for trust and reliability.",
    icon: Lock,
    keywords: "data security, encryption, cloud security, privacy",
  },
];

const FeaturesSection = () => {
  return (
    <section id="platform" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Value Proposition */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            One Platform. One Connected School Community.
          </h2>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto">
            Running a modern school is about more than managing records. It's about
            creating an environment where school leaders, teachers, parents, and
            students stay connected through reliable information, clear communication,
            and efficient operations.
          </p>
          <p className="mt-3 text-base text-foreground/50 max-w-2xl mx-auto">
            Choose the capabilities your school needs today and expand as your
            community grows.
          </p>
        </div>

        {/* Modules Grid - Outcome-focused */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {outcomeModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base">
                    {module.title}
                  </h3>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {module.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;