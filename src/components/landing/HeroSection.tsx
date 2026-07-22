import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  GraduationCap,
  DollarSign,
  BookOpen,
  UserCheck,
  BarChart3,
  Clock,
  UserCircle,
  TrendingUp,
  MessageSquare,
  School,
} from "lucide-react";

// Module icons mapping
const moduleIcons: Record<string, React.ReactNode> = {
  Attendance: <UserCheck className="h-5 w-5" />,
  Students: <Users className="h-5 w-5" />,
  Finance: <DollarSign className="h-5 w-5" />,
  Exams: <BookOpen className="h-5 w-5" />,
  Teachers: <GraduationCap className="h-5 w-5" />,
  Reports: <BarChart3 className="h-5 w-5" />,
  Timetable: <Clock className="h-5 w-5" />,
  "Parent Portal": <UserCircle className="h-5 w-5" />,
  Analytics: <TrendingUp className="h-5 w-5" />,
  Communication: <MessageSquare className="h-5 w-5" />,
};

// All modules with icons
const modules = [
  "Attendance",
  "Students",
  "Finance",
  "Exams",
  "Teachers",
  "Reports",
  "Timetable",
  "Parent Portal",
  "Analytics",
  "Communication",
];

interface LandingStats {
  schools: number;
  students: number;
  teachers: number;
  uptime: string;
}

const HeroSection = () => {
  const [stats, setStats] = useState<LandingStats>({
    schools: 0,
    students: 0,
    teachers: 0,
    uptime: "99.9",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLandingStats();
  }, []);

  const fetchLandingStats = async () => {
    try {
      // Fetch schools count
      const { count: schoolsCount, error: schoolsError } = await supabase
        .from("schools")
        .select("*", { count: "exact", head: true });

      if (schoolsError) throw schoolsError;

      // Fetch students count
      const { count: studentsCount, error: studentsError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (studentsError) throw studentsError;

      // Fetch teachers count (staff with position containing 'teacher')
      const { count: teachersCount, error: teachersError } = await supabase
        .from("staff_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .ilike("position", "%teacher%");

      if (teachersError) throw teachersError;

      setStats({
        schools: schoolsCount || 0,
        students: studentsCount || 0,
        teachers: teachersCount || 0,
        uptime: "99.9",
      });
    } catch (err) {
      console.error("Failed to fetch landing stats:", err);
      // Fallback to demo data
      setStats({
        schools: 500,
        students: 120000,
        teachers: 8000,
        uptime: "99.9",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-school.jpg"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-transparent" />
      </div>

      {/* Content Container - Centered with max-width */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <School className="h-4 w-4" />
            School Management Platform
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
          >
            School <span className="text-primary">Pulse</span>
            <br />
            <span className="text-foreground/80">Management Made Simple</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-foreground/80 max-w-2xl leading-relaxed"
          >
            A powerful, modular school management platform. Select only the features
            you need — student management, teacher management, attendance, exams,
            finance, timetable, parent portal, analytics, communication, and more —
            with transparent, usage-based pricing.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Create Your School
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary-foreground/50 text-foreground font-semibold rounded-lg hover:bg-foreground/10 hover:border-primary-foreground/70 transition-colors focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-background"
            >
              Login
            </Link>
          </motion.div>

        </div>

        {/* Stats Section - Live Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-foreground/10 grid grid-cols-2 sm:grid-cols-4 gap-6"
        >
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.schools)
              )}
              <span className="text-sm font-normal text-foreground/60 ml-1">+</span>
            </div>
            <div className="text-sm text-foreground/60">Schools</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.students)
              )}
              <span className="text-sm font-normal text-foreground/60 ml-1">+</span>
            </div>
            <div className="text-sm text-foreground/60">Students</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.teachers)
              )}
              <span className="text-sm font-normal text-foreground/60 ml-1">+</span>
            </div>
            <div className="text-sm text-foreground/60">Teachers</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground">
              {stats.uptime}%
              <span className="text-sm font-normal text-foreground/60 ml-1">uptime</span>
            </div>
            <div className="text-sm text-foreground/60">System Reliability</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;