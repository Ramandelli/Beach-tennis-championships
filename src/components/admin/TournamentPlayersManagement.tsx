import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tournament, 
  PlayerProfile,
  getPlayerProfile, 
  updateDoc, 
  doc, 
  db,
  collection,
  query,
  where,
  getDocs
} from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { CheckCircleIcon, XCircleIcon, UserPlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TournamentPlayersManagementProps {
  tournament: Tournament;
  onRefetch: () => void;
}

const TournamentPlayersManagement = ({ tournament, onRefetch }: TournamentPlayersManagementProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddingPlayers, setIsAddingPlayers] = useState(false);
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  
  const { data: playerProfiles, isLoading } = useQuery({
    queryKey: ['tournament-players', tournament.id],
    queryFn: async () => {
      const profiles: PlayerProfile[] = [];
      
      for (const playerId of tournament.participants) {
        const profile = await getPlayerProfile(playerId);
        if (profile) {
          profiles.push(profile);
        }
      }
      
      return profiles;
    }
  });
  
  const filteredPlayers = playerProfiles?.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          player.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];
  
  const handleRemovePlayer = async (playerId: string) => {
    try {
      const updatedParticipants = tournament.participants.filter(id => id !== playerId);
      
      const tournamentRef = doc(db, "tournaments", tournament.id);
      await updateDoc(tournamentRef, { participants: updatedParticipants });
      
      toast({
        title: "Sucesso",
        description: "Jogador removido do campeonato",
      });
      
      onRefetch();
    } catch (error) {
      console.error("Error removing player:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o jogador",
        variant: "destructive",
      });
    }
  };
  
  const handleAddPlayerByEmail = async () => {
    if (!newPlayerEmail) return;
    
    setIsAddingPlayer(true);
    
    try {
      const playersRef = collection(db, "players");
      const q = query(playersRef, where("email", "==", newPlayerEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          title: "Jogador não encontrado",
          description: "Não existe um jogador com este email",
          variant: "destructive",
        });
        return;
      }
      
      const playerDoc = querySnapshot.docs[0];
      const playerId = playerDoc.id;
      
      if (tournament.participants.includes(playerId)) {
        toast({
          title: "Jogador já inscrito",
          description: "Este jogador já está inscrito neste campeonato",
          variant: "destructive",
        });
        return;
      }
      
      const updatedParticipants = [...tournament.participants, playerId];
      
      const tournamentRef = doc(db, "tournaments", tournament.id);
      await updateDoc(tournamentRef, { participants: updatedParticipants });
      
      toast({
        title: "Sucesso",
        description: "Jogador adicionado ao campeonato",
      });
      
      setNewPlayerEmail("");
      onRefetch();
    } catch (error) {
      console.error("Error adding player:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o jogador",
        variant: "destructive",
      });
    } finally {
      setIsAddingPlayer(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              className="pl-8 w-[250px]"
              placeholder="Buscar jogador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </span>
          </div>
          
          <select 
            className="border rounded-md px-3 py-1.5 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {tournament.categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <UserPlusIcon className="h-4 w-4" />
              Adicionar Jogador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Jogador</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email do Jogador
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleAddPlayerByEmail}
                disabled={isAddingPlayer}
              >
                {isAddingPlayer ? "Adicionando..." : "Adicionar Jogador"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-t-2 border-b-2 border-gray-900 rounded-full"></div>
          <p>Carregando jogadores...</p>
        </div>
      ) : filteredPlayers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jogador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow key={player.uid}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {player.avatarUrl ? (
                      <img 
                        src={player.avatarUrl} 
                        alt={player.name} 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {player.name}
                  </div>
                </TableCell>
                <TableCell>{player.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    <CheckCircleIcon className="mr-1 h-3 w-3" />
                    Confirmado
                  </span>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRemovePlayer(player.uid)}
                  >
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-10 border rounded-lg bg-gray-50">
          <UserPlusIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Nenhum jogador encontrado</p>
          <p className="text-gray-400 text-sm">
            {searchQuery ? "Tente ajustar sua busca." : "Adicione jogadores ao campeonato."}
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentPlayersManagement;
