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
} from "lucide-react";

const features = [
  {
    title: "Student Management",
    description: "Complete student profiles, enrollment, transfers, and academic history tracking.",
    icon: Users,
  },
  {
    title: "Teacher Management",
    description: "Manage teacher profiles, assignments, workload, and performance reviews.",
    icon: GraduationCap,
  },
  {
    title: "Attendance",
    description: "Daily attendance tracking with bulk entry, reports, and parent notifications.",
    icon: UserCheck,
  },
  {
    title: "Exams & Grading",
    description: "Create exams, enter marks, calculate grades, and generate report cards.",
    icon: BookOpen,
  },
  {
    title: "Finance",
    description: "Fee structures, student billing, payment tracking, and financial reports.",
    icon: DollarSign,
  },
  {
    title: "Communication",
    description: "Announcements, notifications, SMS/email alerts, and parent-teacher messaging.",
    icon: MessageSquare,
  },
  {
    title: "Timetable",
    description: "Visual timetable builder with conflict detection and multiple views.",
    icon: Clock,
  },
  {
    title: "Parent Portal",
    description: "Parent access to attendance, results, fees, and school announcements.",
    icon: UserCircle,
  },
  {
    title: "Analytics",
    description: "Advanced analytics, predictive insights, and custom dashboards.",
    icon: BarChart3,
  },
  {
    title: "Data Security",
    description: "Enterprise-grade security with RLS policies, encryption, and audit logs.",
    icon: Shield,
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Centered */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to Run Your School
          </h2>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto">
            Choose the modules you need and scale as your school grows.
            All modules work seamlessly together.
          </p>
        </div>

        {/* Features Grid - Centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
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
                    {feature.title}
                  </h3>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {feature.description}
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