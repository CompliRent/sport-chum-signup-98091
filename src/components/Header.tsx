import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Home, Trophy, LogIn } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            BetSocial
          </h1>
          
          <nav className="hidden md:flex items-center gap-6">
            <NavLink 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </NavLink>
            
            <NavLink 
              to="/leagues" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground font-medium"
            >
              <Trophy className="h-4 w-4" />
              <span>Leagues</span>
            </NavLink>
          </nav>
        </div>

        <NavLink to="/auth">
          <Button variant="outline" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
        </NavLink>
      </div>
    </header>
  );
};

export default Header;
