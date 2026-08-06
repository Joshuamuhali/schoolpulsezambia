import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  School,
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
} from "lucide-react";

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
          src="/hero-school.png"
          alt="Modern school campus in Zambia"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      </div>

      {/* Content Container - Centered with max-width */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="max-w-3xl">
          {/* Eyebrow - Brand Positioning */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20"
          >
            <School className="h-4 w-4" />
            The Digital Operating System for Modern Schools
          </motion.div>

          {/* Headline - Transformation-focused */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight"
          >
            Build a More{" "}
            <span className="text-success">Connected</span> School.
          </motion.h1>

          {/* Supporting Copy - Outcome-focused */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-white/90 max-w-2xl leading-relaxed"
          >
            School Pulse helps schools bring academics, administration, finance,
            teachers, parents, and students together in one intelligent platform—so
            your team can spend less time managing systems and more time shaping
            futures.
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
              className="inline-flex items-center justify-center px-8 py-3 bg-success text-white font-semibold rounded-lg hover:bg-success/90 transition-colors focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-black"
            >
              Create Account
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/50 transition-colors focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              Login
            </Link>
          </motion.div>
        </div>

        {/* Stats Section - Trust & Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6"
        >
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.schools)
              )}
              <span className="text-sm font-normal text-white/60 ml-1">+</span>
            </div>
            <div className="text-sm text-white/60 mt-1">Schools</div>
            <div className="text-xs text-white/40 mt-0.5">
              Growing together with schools
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.students)
              )}
              <span className="text-sm font-normal text-white/60 ml-1">+</span>
            </div>
            <div className="text-sm text-white/60 mt-1">Students</div>
            <div className="text-xs text-white/40 mt-0.5">
              Supporting every learner's journey
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatNumber(stats.teachers)
              )}
              <span className="text-sm font-normal text-white/60 ml-1">+</span>
            </div>
            <div className="text-sm text-white/60 mt-1">Teachers</div>
            <div className="text-xs text-white/40 mt-0.5">
              Empowering educators every day
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-white">
              {stats.uptime}%
              <span className="text-sm font-normal text-white/60 ml-1">uptime</span>
            </div>
            <div className="text-sm text-white/60 mt-1">Reliability</div>
            <div className="text-xs text-white/40 mt-0.5">
              Technology schools can depend on
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;