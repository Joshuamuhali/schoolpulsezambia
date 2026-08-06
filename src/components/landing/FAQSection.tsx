import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "What is a school management system?",
    answer: "A school management system is a comprehensive digital platform that helps schools manage their daily operations, including student information, attendance, academics, finance, communication, and parent engagement. School Pulse is a cloud-based school management system designed specifically for modern schools in Zambia and across Africa."
  },
  {
    question: "How does School Pulse work?",
    answer: "School Pulse is a cloud-based platform that brings all your school operations into one connected system. School leaders, teachers, parents, and students can access the information they need through web and mobile devices. You choose the modules your school needs, and everything works together seamlessly."
  },
  {
    question: "Can private schools use School Pulse?",
    answer: "Yes! School Pulse is designed for all types of schools including private schools, primary schools, secondary schools, colleges, and training institutions across Zambia. Our modular approach means you can start with what you need and expand as your school grows."
  },
  {
    question: "Is School Pulse cloud-based?",
    answer: "Yes, School Pulse is a modern cloud-based platform. This means you can access your school data from anywhere, anytime, on any device. Your data is securely stored with enterprise-grade encryption and 99.9% uptime reliability."
  },
  {
    question: "Does School Pulse include parent communication?",
    answer: "Absolutely. Parent engagement is at the heart of School Pulse. Our platform includes parent portals, real-time notifications, messaging systems, and progress tracking so families stay connected and informed throughout their child's educational journey."
  },
  {
    question: "Can schools choose only the modules they need?",
    answer: "Yes, School Pulse offers a modular approach. You can start with the core modules your school needs today and add more capabilities as your community grows. This flexible approach ensures you only pay for what you use while maintaining a fully integrated system."
  },
  {
    question: "How secure is School Pulse?",
    answer: "Security is our top priority. School Pulse uses enterprise-grade security measures including encrypted data storage, secure cloud infrastructure, role-based access controls, and regular security audits. We comply with data protection standards to ensure your school's information remains safe and confidential."
  },
  {
    question: "Which regions in Zambia does School Pulse serve?",
    answer: "School Pulse serves schools across all provinces in Zambia, including Lusaka, Copperbelt, Southern Province, Eastern Province, Northern Province, and Western Province. We're proud to support Zambian schools in their digital transformation journey."
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto">
            Everything you need to know about School Pulse and how it can transform your school.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-foreground/60 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-foreground/60 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;