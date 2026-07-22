import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-4xl py-12">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <Activity className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-bold">School Pulse</span>
          </Link>
          <h1 className="font-display text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using School Pulse, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">2. Use License</h2>
            <p className="text-muted-foreground mb-3">
              Permission is granted to temporarily use School Pulse for personal or commercial school management purposes.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You may not modify or copy the materials</li>
              <li>You may not use the materials for commercial purposes without authorization</li>
              <li>You may not attempt to reverse engineer any software</li>
              <li>You may not remove any copyright or proprietary notations</li>
            </ul>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">3. Data Privacy</h2>
            <p className="text-muted-foreground">
              We take data privacy seriously. All student, teacher, and school data is encrypted and stored securely.
              We comply with applicable data protection regulations including GDPR and local data protection laws.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">4. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted access.
              We reserve the right to modify or discontinue the service with reasonable notice.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">5. Payment Terms</h2>
            <p className="text-muted-foreground">
              Subscription fees are billed monthly or annually. All payments are non-refundable unless otherwise stated.
              We reserve the right to change pricing with 30 days notice.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">6. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at:
              <br />
              <a href="mailto:legal@schoolpulse.com" className="text-primary hover:underline">
                legal@schoolpulse.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link to="/onboarding">
            <Button variant="hero">Back to Onboarding</Button>
          </Link>
          <Link to="/privacy">
            <Button variant="outline">Privacy Policy</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;