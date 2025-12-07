import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          BetBuddies
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground">
          The future of social sports betting
        </p>
        <p className="text-lg text-muted-foreground">
          Connect with friends, share predictions, and win together
        </p>
        <div className="flex gap-4 justify-center">
          <Link to={user ? "/leagues" : "/auth"}>
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Index;
