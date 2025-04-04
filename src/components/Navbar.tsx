
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { Menu, X, User, Trophy, Calendar, LogOut, Settings } from "lucide-react";

const Navbar = () => {
  const { user, playerProfile, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get display name, prioritizing playerProfile.name, falling back to user.displayName
  const displayName = playerProfile?.name || user?.displayName || "Usuário";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Ocorreu um erro ao tentar sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold beach-text-gradient">BeachTennis</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/tournaments" className="text-gray-700 hover:text-beach-blue transition-colors">
              Campeonatos
            </Link>
            <Link to="/ranking" className="text-gray-700 hover:text-beach-blue transition-colors">
              Ranking
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-gray-700 hover:text-beach-blue transition-colors">
                Admin
              </Link>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={playerProfile?.avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-beach-blue text-white">
                        {displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-tournaments" className="cursor-pointer flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Meus Campeonatos</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Entrar
                </Button>
                <Button className="bg-beach-blue hover:bg-beach-blue/90" onClick={() => navigate("/register")}>
                  Cadastrar
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 space-y-3">
            <Link
              to="/tournaments"
              className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Calendar className="inline-block mr-2 h-4 w-4" />
              Campeonatos
            </Link>
            <Link
              to="/ranking"
              className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Trophy className="inline-block mr-2 h-4 w-4" />
              Ranking
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="inline-block mr-2 h-4 w-4" />
                Admin
              </Link>
            )}
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="inline-block mr-2 h-4 w-4" />
                  Meu Perfil
                </Link>
                <Link
                  to="/my-tournaments"
                  className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar className="inline-block mr-2 h-4 w-4" />
                  Meus Campeonatos
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 px-4 text-gray-700 hover:bg-gray-100 rounded"
                >
                  <LogOut className="inline-block mr-2 h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 px-4">
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Entrar
                </Button>
                <Button className="bg-beach-blue hover:bg-beach-blue/90" onClick={() => navigate("/register")}>
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
