import { motion } from "framer-motion";
import { Users, MessageSquare, BookOpen, Heart } from "lucide-react";

const CommunitySection = () => {
  const communityPillars = [
    {
      icon: Users,
      title: "School Leaders",
      description: "Empower principals and administrators with the insights they need to make confident decisions.",
    },
    {
      icon: BookOpen,
      title: "Teachers",
      description: "Give educators seamless tools to manage classrooms and focus on what they do best—teaching.",
    },
    {
      icon: Heart,
      title: "Parents",
      description: "Keep families connected and engaged with real-time access to their child's progress.",
    },
    {
      icon: MessageSquare,
      title: "Students",
      description: "Support every learner with a connected, organized educational journey from day one.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Great Schools Are Built Together.
          </h2>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto leading-relaxed">
            Education is strongest when schools, teachers, parents, and students work
            as one community. School Pulse strengthens those connections by making
            communication simpler, information more accessible, and collaboration part
            of everyday school life.
          </p>
        </div>

        {/* Community Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {communityPillars.map((pillar, index) => {
            const Icon = pillar.icon;
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
                  {pillar.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;