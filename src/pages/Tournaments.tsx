import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTournaments, Tournament, registerPlayerForTournament } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Search, CalendarClock } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";

const Tournaments = () => {
  const { user, playerProfile } = useAuth();
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<Tournament[]>([]);
  const [cancelledTournaments, setCancelledTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [registering, setRegistering] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const tournaments = await getTournaments();
        setAllTournaments(tournaments);
        
        setUpcomingTournaments(tournaments.filter(t => t.status === 'upcoming'));
        setActiveTournaments(tournaments.filter(t => t.status === 'active'));
        setCompletedTournaments(tournaments.filter(t => t.status === 'completed'));
        setCancelledTournaments(tournaments.filter(t => t.status === 'cancelled'));
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os campeonatos. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [toast]);

  const handleRegister = async (tournamentId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para se inscrever em um campeonato.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    setRegistering(tournamentId);
    
    try {
      await registerPlayerForTournament(tournamentId, user.uid);
      
      toast({
        title: "Inscrição realizada",
        description: "Você foi inscrito com sucesso neste campeonato!",
      });
      
      const updatedTournaments = allTournaments.map(tournament => {
        if (tournament.id === tournamentId) {
          return {
            ...tournament,
            participants: [...tournament.participants, user.uid]
          };
        }
        return tournament;
      });
      
      setAllTournaments(updatedTournaments);
      setUpcomingTournaments(updatedTournaments.filter(t => t.status === 'upcoming'));
      // Caso queira atualizar os torneios ativos também, faça-o aqui se necessário.
    } catch (error: any) {
      let message = "Não foi possível concluir sua inscrição.";
      
      if (error.message === "Player already registered for this tournament") {
        message = "Você já está inscrito neste campeonato.";
      }
      
      toast({
        title: "Erro na inscrição",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRegistering(null);
    }
  };

  const filterTournaments = (tournaments: Tournament[]) => {
    if (!searchTerm) return tournaments;
    
    const term = searchTerm.toLowerCase();
    return tournaments.filter(
      tournament => 
        tournament.name.toLowerCase().includes(term) ||
        tournament.description.toLowerCase().includes(term) ||
        tournament.location.toLowerCase().includes(term) ||
        tournament.categories.some(cat => cat.toLowerCase().includes(term))
    );
  };

  const isRegistered = (tournament: Tournament) => {
    return user ? tournament.participants.includes(user.uid) : false;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Campeonatos</h1>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por nome, local ou categoria..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">
            Próximos ({upcomingTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Em andamento ({activeTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Finalizados ({completedTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelados ({cancelledTournaments.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          {loading ? (
            <div className="flex justify-center py-12">
              <CalendarClock className="h-12 w-12 animate-pulse text-muted-foreground" />
            </div>
          ) : filterTournaments(upcomingTournaments).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterTournaments(upcomingTournaments).map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isRegistered={isRegistered(tournament)}
                  onRegister={() => handleRegister(tournament.id)}
                  loading={registering === tournament.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Não há campeonatos programados no momento. Volte em breve!"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="active">
          {loading ? (
            <div className="flex justify-center py-12">
              <CalendarClock className="h-12 w-12 animate-pulse text-muted-foreground" />
            </div>
          ) : filterTournaments(activeTournaments).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterTournaments(activeTournaments).map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isRegistered={isRegistered(tournament)}
                  onRegister={() => handleRegister(tournament.id)}
                  loading={registering === tournament.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato em andamento</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Não há campeonatos ativos no momento. Confira os próximos campeonatos!"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {loading ? (
            <div className="flex justify-center py-12">
              <CalendarClock className="h-12 w-12 animate-pulse text-muted-foreground" />
            </div>
          ) : filterTournaments(completedTournaments).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterTournaments(completedTournaments).map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato finalizado</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Não há campeonatos finalizados ainda."}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="cancelled">
          {loading ? (
            <div className="flex justify-center py-12">
              <CalendarClock className="h-12 w-12 animate-pulse text-muted-foreground" />
            </div>
          ) : filterTournaments(cancelledTournaments).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterTournaments(cancelledTournaments).map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato cancelado</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Não há campeonatos cancelados."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tournaments;
