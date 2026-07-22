import { Activity } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card py-12">
    <div className="container flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <span className="font-display text-lg font-bold">SchoolPulse</span>
      </div>
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} SchoolPulse. School Management Platform.
      </p>
    </div>
  </footer>
);

export default Footer;
