import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-8 md:p-12 lg:p-16"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2x 2x, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Start Your Journey
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Ready to Build a Future-Ready School?
            </h2>

            <p className="text-lg md:text-xl text-foreground/60 mb-8 leading-relaxed">
              Whether you're opening a new school or modernizing an established
              institution, School Pulse gives your community the tools to operate
              with confidence, stay connected, and grow together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 group"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary/30 text-primary font-semibold rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Login
              </Link>
            </div>

            <p className="mt-6 text-sm text-foreground/50">
              No commitment required. See how School Pulse can transform your school.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;