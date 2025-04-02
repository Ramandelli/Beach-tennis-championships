
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Match,
  PlayerProfile,
  getPlayerProfile, 
  createMatch,
  updateMatchResult,
  db,
  doc,
  updateDoc
} from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { CheckCircleIcon, ClockIcon, PlusCircleIcon, TrophyIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface TournamentMatchesManagementProps {
  tournament: Tournament;
  onRefetch: () => void;
}

const TournamentMatchesManagement = ({ tournament, onRefetch }: TournamentMatchesManagementProps) => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRound, setSelectedRound] = useState<string>("all");
  
  // Match creation state
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [matchCategory, setMatchCategory] = useState<string>("");
  const [matchRound, setMatchRound] = useState<string>("");
  const [matchDate, setMatchDate] = useState<Date | undefined>(new Date());
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  
  // Match result update state
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<string>("");
  const [matchWinner, setMatchWinner] = useState<string[]>([]);
  
  // Common round names for beach tennis
  const roundOptions = [
    "group-stage", "round-of-16", "quarter-final", "semi-final", "final", "bronze-match"
  ];
  
  // Fetch player profiles for the tournament participants
  const { data: playerProfiles, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['tournament-players-for-matches', tournament.id],
    queryFn: async () => {
      const profiles: Record<string, PlayerProfile> = {};
      
      for (const playerId of tournament.participants) {
        const profile = await getPlayerProfile(playerId);
        if (profile) {
          profiles[playerId] = profile;
        }
      }
      
      return profiles;
    }
  });
  
  // Get all matches in this tournament
  const matches = tournament.matches || [];
  
  // Filter matches based on category and round
  const filteredMatches = matches.filter(match => {
    const matchesCategory = selectedCategory === "all" || match.category === selectedCategory;
    const matchesRound = selectedRound === "all" || match.round === selectedRound;
    return matchesCategory && matchesRound;
  });
  
  const getPlayerName = (playerId: string) => {
    return playerProfiles?.[playerId]?.name || 'Jogador desconhecido';
  };
  
  const getTeamDisplay = (teamIds: string[]) => {
    return teamIds.map(id => getPlayerName(id)).join(' & ');
  };
  
  const handleCreateMatch = async () => {
    if (!matchCategory || !matchRound || !matchDate || team1Players.length === 0 || team2Players.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos para criar a partida",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingMatch(true);
    
    try {
      const newMatch: Omit<Match, 'id'> = {
        tournamentId: tournament.id,
        category: matchCategory,
        round: matchRound,
        team1: team1Players,
        team2: team2Players,
        date: matchDate,
        status: 'scheduled'
      };
      
      await createMatch(newMatch);
      
      toast({
        title: "Sucesso",
        description: "Partida criada com sucesso",
      });
      
      // Reset form
      setMatchCategory("");
      setMatchRound("");
      setMatchDate(new Date());
      setTeam1Players([]);
      setTeam2Players([]);
      
      onRefetch();
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a partida",
        variant: "destructive",
      });
    } finally {
      setIsCreatingMatch(false);
    }
  };
  
  const handleUpdateMatchResult = async () => {
    if (!updatingMatchId || !matchScore || !matchWinner || matchWinner.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o placar e selecione o vencedor",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateMatchResult(updatingMatchId, matchScore, matchWinner);
      
      toast({
        title: "Sucesso",
        description: "Resultado da partida atualizado com sucesso",
      });
      
      setUpdatingMatchId(null);
      setMatchScore("");
      setMatchWinner([]);
      
      onRefetch();
    } catch (error) {
      console.error("Error updating match result:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o resultado da partida",
        variant: "destructive",
      });
    }
  };
  
  const openResultDialog = (match: Match) => {
    setUpdatingMatchId(match.id);
    setMatchScore(match.score || "");
    setMatchWinner(match.winner || []);
  };
  
  const formatRoundName = (roundCode: string) => {
    switch (roundCode) {
      case "group-stage": return "Fase de grupos";
      case "round-of-16": return "Oitavas de final";
      case "quarter-final": return "Quartas de final";
      case "semi-final": return "Semifinal";
      case "final": return "Final";
      case "bronze-match": return "Disputa 3º lugar";
      default: return roundCode;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
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
          
          <select 
            className="border rounded-md px-3 py-1.5 text-sm"
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
          >
            <option value="all">Todas as rodadas</option>
            {roundOptions.map(round => (
              <option key={round} value={round}>{formatRoundName(round)}</option>
            ))}
          </select>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <PlusCircleIcon className="h-4 w-4" />
              Nova Partida
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Partida</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <select 
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={matchCategory}
                    onChange={(e) => setMatchCategory(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {tournament.categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rodada</label>
                  <select 
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={matchRound}
                    onChange={(e) => setMatchRound(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {roundOptions.map(round => (
                      <option key={round} value={round}>{formatRoundName(round)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da Partida</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !matchDate && "text-muted-foreground"
                      )}
                    >
                      {matchDate ? format(matchDate, "PPP") : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={matchDate}
                      onSelect={setMatchDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Time 1</label>
                <select 
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                  value={team1Players[0] || ""}
                  onChange={(e) => setTeam1Players([e.target.value])}
                >
                  <option value="">Selecione o jogador...</option>
                  {tournament.participants.map(playerId => (
                    <option key={playerId} value={playerId}>
                      {getPlayerName(playerId)}
                    </option>
                  ))}
                </select>
                {matchCategory === "duplas" && (
                  <select 
                    className="w-full border rounded-md px-3 py-1.5 text-sm mt-2"
                    value={team1Players[1] || ""}
                    onChange={(e) => {
                      const player1 = team1Players[0] || "";
                      setTeam1Players([player1, e.target.value]);
                    }}
                  >
                    <option value="">Selecione o parceiro...</option>
                    {tournament.participants
                      .filter(id => id !== team1Players[0])
                      .map(playerId => (
                        <option key={playerId} value={playerId}>
                          {getPlayerName(playerId)}
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Time 2</label>
                <select 
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                  value={team2Players[0] || ""}
                  onChange={(e) => setTeam2Players([e.target.value])}
                >
                  <option value="">Selecione o jogador...</option>
                  {tournament.participants
                    .filter(id => !team1Players.includes(id))
                    .map(playerId => (
                      <option key={playerId} value={playerId}>
                        {getPlayerName(playerId)}
                      </option>
                    ))
                  }
                </select>
                {matchCategory === "duplas" && (
                  <select 
                    className="w-full border rounded-md px-3 py-1.5 text-sm mt-2"
                    value={team2Players[1] || ""}
                    onChange={(e) => {
                      const player1 = team2Players[0] || "";
                      setTeam2Players([player1, e.target.value]);
                    }}
                  >
                    <option value="">Selecione o parceiro...</option>
                    {tournament.participants
                      .filter(id => !team1Players.includes(id) && id !== team2Players[0])
                      .map(playerId => (
                        <option key={playerId} value={playerId}>
                          {getPlayerName(playerId)}
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleCreateMatch}
                disabled={isCreatingMatch}
              >
                {isCreatingMatch ? "Criando..." : "Criar Partida"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoadingPlayers ? (
        <div className="text-center py-10">
          <ClockIcon className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p>Carregando dados...</p>
        </div>
      ) : filteredMatches.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Rodada</TableHead>
              <TableHead>Time 1</TableHead>
              <TableHead>Time 2</TableHead>
              <TableHead>Placar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMatches.map((match) => (
              <TableRow key={match.id}>
                <TableCell>{format(new Date(match.date), "dd/MM/yyyy")}</TableCell>
                <TableCell>{match.category}</TableCell>
                <TableCell>{formatRoundName(match.round)}</TableCell>
                <TableCell>{getTeamDisplay(match.team1)}</TableCell>
                <TableCell>{getTeamDisplay(match.team2)}</TableCell>
                <TableCell>{match.score || "-"}</TableCell>
                <TableCell>
                  {match.status === 'completed' ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      <CheckCircleIcon className="mr-1 h-3 w-3" />
                      Concluída
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      <ClockIcon className="mr-1 h-3 w-3" />
                      Agendada
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {match.status !== 'completed' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openResultDialog(match)}
                        >
                          <TrophyIcon className="h-4 w-4 mr-1" />
                          Resultado
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Registrar Resultado</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {getTeamDisplay(match.team1)} vs {getTeamDisplay(match.team2)}
                            </label>
                            <Input
                              placeholder="ex: 6-4, 7-5"
                              value={matchScore}
                              onChange={(e) => setMatchScore(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Vencedor</label>
                            <div className="flex flex-col space-y-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  checked={matchWinner.toString() === match.team1.toString()}
                                  onChange={() => setMatchWinner(match.team1)}
                                  className="rounded border-gray-300"
                                />
                                <span>{getTeamDisplay(match.team1)}</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  checked={matchWinner.toString() === match.team2.toString()}
                                  onChange={() => setMatchWinner(match.team2)}
                                  className="rounded border-gray-300"
                                />
                                <span>{getTeamDisplay(match.team2)}</span>
                              </label>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleUpdateMatchResult}
                          >
                            Salvar Resultado
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-10 border rounded-lg bg-gray-50">
          <PlusCircleIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Nenhuma partida encontrada</p>
          <p className="text-gray-400 text-sm">
            Crie partidas para este campeonato.
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentMatchesManagement;
