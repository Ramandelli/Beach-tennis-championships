
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTournamentById, Tournament, Match, getPlayerProfile, PlayerProfile } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, MapPin, Users, Trophy, ArrowLeft, Award } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const TournamentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Record<string, PlayerProfile>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchTournament = async () => {
      if (!id) return;
      
      try {
        const tournamentData = await getTournamentById(id);
        if (!tournamentData) {
          toast({
            title: "Erro",
            description: "Campeonato não encontrado",
            variant: "destructive",
          });
          return;
        }
        
        setTournament(tournamentData);
        
        // Fetch player profiles for this tournament
        const playersData: Record<string, PlayerProfile> = {};
        for (const playerId of tournamentData.participants) {
          const playerProfile = await getPlayerProfile(playerId);
          if (playerProfile) {
            playersData[playerId] = playerProfile;
          }
        }
        
        setPlayers(playersData);
      } catch (error) {
        console.error("Error fetching tournament:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do campeonato",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournament();
  }, [id, toast]);

  const formatDate = (date: Date | string | undefined) => {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Em breve';
      case 'active':
        return 'Em andamento';
      case 'completed':
        return 'Finalizado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to display player names instead of IDs
  const getPlayerName = (playerId: string) => {
    if (players[playerId]) {
      return players[playerId].name;
    }
    return "Jogador desconhecido";
  };

  // Helper function to display team members with names
  const getTeamDisplayWithNames = (teamIds: string[]) => {
    return teamIds.map(id => getPlayerName(id)).join(' & ');
  };

  // Helper to render the podium if tournament is completed
  const renderPodium = () => {
    if (!tournament || tournament.status !== 'completed' || !tournament.podium) {
      return null;
    }

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Pódio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            {/* Champion */}
            {tournament.podium.champion && (
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-full mb-2">
                  <Trophy className="h-10 w-10 text-yellow-500" />
                </div>
                <span className="font-bold text-lg">Campeão</span>
                <span className="text-base">
                  {tournament.podium.champion.map(id => getPlayerName(id)).join(' & ')}
                </span>
              </div>
            )}

            {/* Runner-up */}
            {tournament.podium.runnerUp && (
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-full mb-2">
                  <Award className="h-10 w-10 text-gray-500" />
                </div>
                <span className="font-bold text-lg">Vice-campeão</span>
                <span className="text-base">
                  {tournament.podium.runnerUp.map(id => getPlayerName(id)).join(' & ')}
                </span>
              </div>
            )}

            {/* Third Place */}
            {tournament.podium.thirdPlace && (
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-full mb-2">
                  <Award className="h-10 w-10 text-orange-500" />
                </div>
                <span className="font-bold text-lg">3º Lugar</span>
                <span className="text-base">
                  {tournament.podium.thirdPlace.map(id => getPlayerName(id)).join(' & ')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <CalendarClock className="h-12 w-12 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">Campeonato não encontrado</h3>
          <p className="text-muted-foreground mb-4">
            O campeonato solicitado não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/tournaments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Campeonatos
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link to="/tournaments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Campeonatos
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(tournament.status)}>
                {getStatusText(tournament.status)}
              </Badge>
              {tournament.categories.map((category) => (
                <Badge key={category} variant="outline">{category}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CalendarClock className="mr-2 h-5 w-5 text-muted-foreground" />
              Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
              Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{tournament.location}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-muted-foreground" />
              Participantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{tournament.participants.length} jogadores</p>
          </CardContent>
        </Card>
      </div>
      
      {tournament.description && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{tournament.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Render podium for completed tournaments */}
      {renderPodium()}
      
      <Tabs defaultValue="matches">
        <TabsList className="mb-6">
          <TabsTrigger value="matches">Partidas</TabsTrigger>
          <TabsTrigger value="players">Participantes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matches">
          {tournament.matches && tournament.matches.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Partidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogadores</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournament.matches.map((match, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">
                            {getTeamDisplayWithNames(match.team1)} vs {getTeamDisplayWithNames(match.team2)}
                          </div>
                        </TableCell>
                        <TableCell>{match.category}</TableCell>
                        <TableCell>
                          {formatDate(match.date)}
                        </TableCell>
                        <TableCell>
                          {match.score || "Não realizada"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              match.status === 'completed'
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {match.status === 'completed' ? "Concluída" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Nenhuma partida cadastrada</p>
              <p className="text-gray-400 text-sm">As partidas serão exibidas aqui quando forem programadas.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="players">
          {tournament.participants.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Participantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Estatísticas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournament.participants.map((playerId) => (
                      <TableRow key={playerId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {players[playerId]?.avatarUrl ? (
                              <img 
                                src={players[playerId].avatarUrl} 
                                alt={players[playerId].name} 
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-500">
                                  {players[playerId]?.name.charAt(0).toUpperCase() || "?"}
                                </span>
                              </div>
                            )}
                            {players[playerId]?.name || "Jogador desconhecido"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {players[playerId] ? (
                            <div className="flex gap-4">
                              <span className="text-sm">
                                <span className="font-medium">Partidas:</span> {players[playerId].stats.matches}
                              </span>
                              <span className="text-sm">
                                <span className="font-medium">Vitórias:</span> {players[playerId].stats.wins}
                              </span>
                              <span className="text-sm">
                                <span className="font-medium">Taxa:</span> {players[playerId].stats.winRate.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            "Informações não disponíveis"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Nenhum participante inscrito</p>
              <p className="text-gray-400 text-sm">Os jogadores aparecerão aqui quando se inscreverem no campeonato.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetails;
