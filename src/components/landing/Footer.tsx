import { Activity } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-card py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold">School Pulse</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Building Connected School Communities. Helping schools manage smarter,
            connect better, and prepare for the future.
          </p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} School Pulse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;