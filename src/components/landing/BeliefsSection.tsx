import { motion } from "framer-motion";
import { Lightbulb, Users, BookOpen, Heart, Target } from "lucide-react";

const BeliefsSection = () => {
  const beliefs = [
    {
      icon: Lightbulb,
      title: "Better Tools",
      description: "Schools deserve technology that reduces complexity, not adds to it.",
    },
    {
      icon: Users,
      title: "Connected Communities",
      description: "Parents should stay informed and engaged in their child's education.",
    },
    {
      icon: BookOpen,
      title: "Empowered Educators",
      description: "Technology should give teachers more time to teach, not more tasks to manage.",
    },
    {
      icon: Heart,
      title: "Every Student Matters",
      description: "Every learner deserves a connected, supported educational journey.",
    },
    {
      icon: Target,
      title: "Confident Leadership",
      description: "School leaders need clear insights to make decisions that shape futures.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            We Believe Schools Deserve Better Tools.
          </h2>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto leading-relaxed">
            Schools should spend less time managing paperwork and more time creating
            meaningful learning experiences. Technology should reduce complexity,
            strengthen relationships, and give school leaders the clarity to make
            better decisions.
          </p>
          <p className="mt-3 text-base text-foreground/50 max-w-2xl mx-auto">
            That belief is at the heart of everything we build.
          </p>
        </div>

        {/* Beliefs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8">
          {beliefs.map((belief, index) => {
            const Icon = belief.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">
                  {belief.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {belief.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BeliefsSection;