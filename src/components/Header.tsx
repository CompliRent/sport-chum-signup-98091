import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, Trophy, LogIn, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useState } from "react";

const Header = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                <Link 
                  to="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Home className="h-5 w-5" />
                  Home
                </Link>
                <Link 
                  to="/leagues" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Trophy className="h-5 w-5" />
                  Leagues
                </Link>
                {user && (
                  <>
                    <Link 
                      to="/profile" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent cursor-pointer">
              BetSocial
            </h1>
          </Link>
          
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

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user.user_metadata?.username?.charAt(0).toUpperCase() || 
                     user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.username || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/leagues" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  My Leagues
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavLink to="/auth">
            <Button variant="outline" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </NavLink>
        )}
      </div>
    </header>
  );
};

export default Header;
