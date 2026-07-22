import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-4xl py-12">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <Activity className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-bold">School Pulse</span>
          </Link>
          <h1 className="font-display text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>School information (name, subdomain, contact details)</li>
              <li>User information (name, email, phone, role)</li>
              <li>Student information (names, admission numbers, academic records)</li>
              <li>Financial information (invoices, payments, fee structures)</li>
              <li>Attendance and exam records</li>
            </ul>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide and maintain the School Pulse platform</li>
              <li>Process transactions and send billing information</li>
              <li>Send administrative information and support updates</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Send you technical notices and security alerts</li>
              <li>Monitor and analyze usage patterns</li>
            </ul>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">3. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your data is stored on secure servers provided by Supabase. We implement appropriate technical and organizational 
              security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              All data is encrypted in transit (TLS/SSL) and at rest.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-3">
              We do not sell, trade, or rent your personal information to others. We may share your information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Service providers who assist in our operations (hosting, email delivery, SMS)</li>
              <li>Law enforcement or government agencies when required by law</li>
              <li>Other users within the same school (as part of normal platform functionality)</li>
            </ul>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">5. Your Rights</h2>
            <p className="text-muted-foreground mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">6. Children's Privacy</h2>
            <p className="text-muted-foreground">
              We collect information about students as part of our school management services. 
              This data is collected and processed at the direction of the school (data controller). 
              Schools are responsible for obtaining necessary consents from parents/guardians.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">7. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="font-display text-2xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:privacy@schoolpulse.com" className="text-primary hover:underline">
                privacy@schoolpulse.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link to="/onboarding">
            <Button variant="hero">Back to Onboarding</Button>
          </Link>
          <Link to="/terms">
            <Button variant="outline">Terms of Service</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;