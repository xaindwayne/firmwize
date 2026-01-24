import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-foreground">IntelliBase</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/services">
              <Button variant="ghost" size="sm">
                Services
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="ghost" size="sm">
                About
              </Button>
            </Link>
            <Link to="/booking">
              <Button variant="ghost" size="sm">
                Book a Meeting
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="default" size="sm" className="bg-accent hover:bg-accent/90">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="pt-16">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Brain className="h-4 w-4" />
              </div>
              <span className="font-semibold text-foreground">IntelliBase</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/services" className="hover:text-foreground transition-colors">Services</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/booking" className="hover:text-foreground transition-colors">Contact</Link>
              <span>© {new Date().getFullYear()} IntelliBase. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}