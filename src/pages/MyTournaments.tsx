
import { useEffect, useState } from "react";
import { getTournaments, Tournament } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, CalendarClock } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";

const MyTournaments = () => {
  const { user } = useAuth();
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchMyTournaments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const tournaments = await getTournaments();
        // Filter for tournaments where the user is a participant
        const userTournaments = tournaments.filter(t => t.participants.includes(user.uid));
        
        setMyTournaments(userTournaments);
        setActiveTournaments(userTournaments.filter(t => t.status === 'upcoming' || t.status === 'active'));
        setCompletedTournaments(userTournaments.filter(t => t.status === 'completed'));
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus campeonatos. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyTournaments();
  }, [user, toast]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Meus Campeonatos</h1>
      
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
      
      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            Inscrições Ativas ({activeTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Finalizados ({completedTournaments.length})
          </TabsTrigger>
        </TabsList>
        
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
                  isRegistered={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato ativo encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Você não está inscrito em nenhum campeonato ativo no momento. Confira a página de campeonatos para se inscrever!"}
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
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato finalizado encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Nenhum resultado para sua busca. Tente termos diferentes." 
                  : "Você ainda não participou de nenhum campeonato finalizado."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyTournaments;
