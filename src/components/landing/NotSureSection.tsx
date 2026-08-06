import { motion } from "framer-motion";
import { MessageCircle, ArrowRight } from "lucide-react";
import LeadCaptureForm from "./LeadCaptureForm";

export default function NotSureSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Not Sure Where To Start?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Every school has a different journey. Tell us about your school and our team will help you find the best way to get started with School Pulse.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>No commitment required</span>
              <span className="text-primary">•</span>
              <span>Free consultation</span>
              <span className="text-primary">•</span>
              <span>We guide you</span>
            </div>
          </motion.div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid sm:grid-cols-3 gap-6 mb-12"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <span className="text-primary font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold mb-1">Share Your Details</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your school and what you need
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <span className="text-primary font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold mb-1">We Reach Out</h3>
              <p className="text-sm text-muted-foreground">
                Our team contacts you within 24 hours
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <span className="text-primary font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold mb-1">Get Guided</h3>
              <p className="text-sm text-muted-foreground">
                We help you choose the right path forward
              </p>
            </div>
          </motion.div>

          {/* Lead Capture Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <LeadCaptureForm />
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by schools across Zambia
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm">No spam</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm">Your data is safe</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm">Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}