
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlusCircleIcon, CalendarIcon, XCircleIcon, CheckCircleIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getPlayerProfile, createMatch, updateMatchResult, Tournament, Match, updateTournamentStatus } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

interface TournamentMatchesManagementProps {
  tournament: Tournament;
  onRefetch: () => void;
}

const TournamentMatchesManagement = ({ tournament, onRefetch }: TournamentMatchesManagementProps) => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedTeam1, setSelectedTeam1] = useState<string[]>([]);
  const [selectedTeam2, setSelectedTeam2] = useState<string[]>([]);
  const [matchDate, setMatchDate] = useState<Date | undefined>(new Date());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchScore, setMatchScore] = useState("");
  const [selectedWinner, setSelectedWinner] = useState<"team1" | "team2" | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [playerAces, setPlayerAces] = useState<Record<string, number>>({});
  
  // Fetch participants data
  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ['tournament-participants', tournament.id],
    queryFn: async () => {
      const players = [];
      for (const playerId of tournament.participants) {
        const player = await getPlayerProfile(playerId);
        if (player) {
          players.push(player);
        }
      }
      return players;
    }
  });
  
  const rounds = ["round-1", "round-2", "quarter-final", "semi-final", "final", "third-place"];
  
  const formatDateDisplay = (date: Date | string | undefined): string => {
    if (!date) return "Data não definida";
    
    try {
      // Handle different date formats
      let dateObj: Date;
      
      // Check if it's already a Date object
      if (date instanceof Date) {
        dateObj = date;
      } 
      // Handle string date representations
      else if (typeof date === 'string') {
        // Try to parse ISO string
        dateObj = parseISO(date);
        
        // Check if it's a Firestore timestamp object in string format
        if (date.toString().includes('seconds') && date.toString().includes('nanoseconds')) {
          try {
            const timestampObj = JSON.parse(date.toString());
            dateObj = new Date(timestampObj.seconds * 1000);
          } catch (parseError) {
            console.error("Error parsing timestamp:", parseError);
          }
        }
      } 
      // Handle Firestore timestamp objects directly
      else if (typeof date === 'object' && date !== null && 'seconds' in date && 'nanoseconds' in date) {
        const timestampObj = date as { seconds: number; nanoseconds: number };
        dateObj = new Date(timestampObj.seconds * 1000);
      }
      // Fallback: try to convert to Date
      else {
        dateObj = new Date(date as any);
      }
      
      // Check if the date is valid before formatting
      if (!isValid(dateObj)) {
        console.error("Invalid date object:", date);
        return "Data não definida";
      }
      
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Data não definida";
    }
  };
  
  const getRoundDisplayName = (round: string): string => {
    switch (round) {
      case "round-1": return "1ª Fase";
      case "round-2": return "2ª Fase";
      case "quarter-final": return "Quartas de Final";
      case "semi-final": return "Semifinal";
      case "final": return "Final";
      case "third-place": return "Disputa de 3º Lugar";
      case "group-stage": return "Fase de Grupos";
      case "round-of-16": return "Oitavas de Final";
      default: return round;
    }
  };

  // Check if final or third-place match already exists
  const hasExistingMatch = (round: string): boolean => {
    return tournament.matches.some(match => match.round === round);
  };

  const checkAndFinalizeTournament = async (match: Match) => {
    if (match.round !== "final" && match.round !== "third-place") return;

    // Check if both final and third-place matches are completed
    const finalMatch = tournament.matches.find(m => m.round === "final" && m.status === "completed");
    const thirdPlaceMatch = tournament.matches.find(m => m.round === "third-place" && m.status === "completed");

    if (finalMatch && thirdPlaceMatch) {
      console.log("Both final and third-place matches are completed, finalizing tournament...");
      try {
        await updateTournamentStatus(tournament.id, "completed");
        toast({
          title: "Campeonato finalizado",
          description: "O campeonato foi finalizado com sucesso.",
        });
      } catch (error) {
        console.error("Error finalizing tournament:", error);
      }
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedCategory || !selectedRound || selectedTeam1.length === 0 || selectedTeam2.length === 0 || !matchDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to create duplicate final or third-place match
    if ((selectedRound === "final" || selectedRound === "third-place") && hasExistingMatch(selectedRound)) {
      toast({
        title: "Erro",
        description: `Já existe uma partida de ${getRoundDisplayName(selectedRound)} cadastrada para este campeonato.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Make sure matchDate is a JavaScript Date object
      const matchData = {
        tournamentId: tournament.id,
        category: selectedCategory,
        round: selectedRound,
        team1: selectedTeam1,
        team2: selectedTeam2,
        date: matchDate,
        status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled'
      };
      
      console.log("Creating match with date:", matchDate);
      await createMatch(matchData);
      
      toast({
        title: "Sucesso",
        description: "Partida criada com sucesso",
      });
      
      // Reset form
      setSelectedCategory("");
      setSelectedRound("");
      setSelectedTeam1([]);
      setSelectedTeam2([]);
      setMatchDate(new Date());
      
      // Close dialog
      setOpenCreateDialog(false);
      
      // Refresh tournament data
      onRefetch();
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a partida",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateMatchResult = async () => {
    if (!selectedMatch || !matchScore || !selectedWinner) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const winnerTeam = selectedWinner === "team1" ? selectedMatch.team1 : selectedMatch.team2;
      
      // Only include aces record if at least one player has aces
      const hasAces = Object.values(playerAces).some(value => value > 0);
      const acesRecord = hasAces ? playerAces : undefined;
      
      await updateMatchResult(selectedMatch.id, matchScore, winnerTeam, acesRecord);
      
      // Check if we need to finalize the tournament
      const updatedMatch = {
        ...selectedMatch,
        score: matchScore,
        winner: winnerTeam,
        status: 'completed' as const
      };
      await checkAndFinalizeTournament(updatedMatch);
      
      toast({
        title: "Sucesso",
        description: "Resultado da partida atualizado com sucesso",
      });
      
      // Reset form
      setSelectedMatch(null);
      setMatchScore("");
      setSelectedWinner(null);
      setPlayerAces({});
      
      // Close dialog
      setOpenResultDialog(false);
      
      // Refresh tournament data
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
  
  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    setMatchScore(match.score || "");
    setSelectedWinner(null);
    
    // Initialize aces count for all players in the match
    const initialAces: Record<string, number> = {};
    [...match.team1, ...match.team2].forEach(playerId => {
      initialAces[playerId] = 0;
    });
    setPlayerAces(initialAces);
    
    setOpenResultDialog(true);
  };
  
  const getPlayerName = (playerId: string) => {
    if (!participants) return playerId;
    const player = participants.find(p => p.uid === playerId);
    return player ? player.name : playerId;
  };
  
  const handleAcesChange = (playerId: string, value: string) => {
    const numAces = parseInt(value) || 0;
    setPlayerAces(prev => ({
      ...prev,
      [playerId]: numAces
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Partidas do Campeonato</h3>
        
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircleIcon className="mr-1" />
              Criar Nova Partida
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Partida</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria*</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournament.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="round">Fase*</Label>
                <Select value={selectedRound} onValueChange={setSelectedRound}>
                  <SelectTrigger id="round">
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {rounds.map((round) => (
                      <SelectItem key={round} value={round}>
                        {getRoundDisplayName(round)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team1">Time 1*</Label>
                <Select value={selectedTeam1[0] || ''} onValueChange={(value) => setSelectedTeam1([value])}>
                  <SelectTrigger id="team1">
                    <SelectValue placeholder="Selecione o jogador/time" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants && participants.map((player) => (
                      <SelectItem key={player.uid} value={player.uid}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team2">Time 2*</Label>
                <Select value={selectedTeam2[0] || ''} onValueChange={(value) => setSelectedTeam2([value])}>
                  <SelectTrigger id="team2">
                    <SelectValue placeholder="Selecione o jogador/time" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants && participants.map((player) => (
                      <SelectItem key={player.uid} value={player.uid} disabled={selectedTeam1.includes(player.uid)}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Data da Partida*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !matchDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {matchDate ? (
                        isValid(matchDate) ? formatDateDisplay(matchDate) : "Data inválida"
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={matchDate}
                      onSelect={setMatchDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCreateMatch}>Criar Partida</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {tournament.matches && tournament.matches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Times</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placar</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.category}</TableCell>
                    <TableCell>{getRoundDisplayName(match.round)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{match.team1.map(id => getPlayerName(id)).join(", ")}</span>
                        <span>vs</span>
                        <span>{match.team2.map(id => getPlayerName(id)).join(", ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateDisplay(match.date)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        match.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
                        match.status === "completed" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {match.status === "scheduled" ? "Agendada" :
                         match.status === "completed" ? "Finalizada" :
                         "Cancelada"}
                      </span>
                    </TableCell>
                    <TableCell>{match.score || "-"}</TableCell>
                    <TableCell>
                      {match.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectMatch(match)}
                        >
                          Registrar Resultado
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Nenhuma partida encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">Crie uma nova partida para começar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          {tournament.matches && tournament.matches.filter(m => m.status === "scheduled").length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Times</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.matches
                  .filter(m => m.status === "scheduled")
                  .map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>{match.category}</TableCell>
                      <TableCell>{getRoundDisplayName(match.round)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{match.team1.map(id => getPlayerName(id)).join(", ")}</span>
                          <span>vs</span>
                          <span>{match.team2.map(id => getPlayerName(id)).join(", ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateDisplay(match.date)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectMatch(match)}
                        >
                          Registrar Resultado
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Nenhuma partida agendada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {tournament.matches && tournament.matches.filter(m => m.status === "completed").length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Times</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Placar</TableHead>
                  <TableHead>Vencedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.matches
                  .filter(m => m.status === "completed")
                  .map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>{match.category}</TableCell>
                      <TableCell>{getRoundDisplayName(match.round)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{match.team1.map(id => getPlayerName(id)).join(", ")}</span>
                          <span>vs</span>
                          <span>{match.team2.map(id => getPlayerName(id)).join(", ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateDisplay(match.date)}</TableCell>
                      <TableCell>{match.score}</TableCell>
                      <TableCell>
                        {match.winner && match.winner.map(id => getPlayerName(id)).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Nenhuma partida finalizada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={openResultDialog} onOpenChange={setOpenResultDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Resultado da Partida</DialogTitle>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Partida</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-medium">{getPlayerName(selectedMatch.team1[0])}</div>
                  <div className="text-muted-foreground">vs</div>
                  <div className="font-medium">{getPlayerName(selectedMatch.team2[0])}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="score">Placar* (ex: 6-4, 7-5)</Label>
                <Input
                  id="score"
                  value={matchScore}
                  onChange={(e) => setMatchScore(e.target.value)}
                  placeholder="6-4, 7-5"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="winner">Vencedor*</Label>
                <Select value={selectedWinner || ''} onValueChange={(value: "team1" | "team2") => setSelectedWinner(value)}>
                  <SelectTrigger id="winner">
                    <SelectValue placeholder="Selecione o vencedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team1">
                      {selectedMatch.team1.map(id => getPlayerName(id)).join(", ")}
                    </SelectItem>
                    <SelectItem value="team2">
                      {selectedMatch.team2.map(id => getPlayerName(id)).join(", ")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Aces por Jogador</Label>
                <div className="grid gap-3">
                  {[...selectedMatch.team1, ...selectedMatch.team2].map(playerId => (
                    <div key={playerId} className="flex justify-between items-center">
                      <span>{getPlayerName(playerId)}</span>
                      <Input
                        type="number"
                        min="0"
                        className="w-20"
                        value={playerAces[playerId] || 0}
                        onChange={(e) => handleAcesChange(playerId, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenResultDialog(false)}
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateMatchResult}
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Salvar Resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentMatchesManagement;
