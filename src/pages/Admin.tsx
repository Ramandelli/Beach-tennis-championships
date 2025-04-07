import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  createTournament, 
  getTournaments, 
  Tournament, 
  PlayerProfile, 
  getPlayerProfile, 
  createMatch, 
  updateMatchResult,
  updateTournamentStatus,
  Match
} from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, TrophyIcon, UsersIcon, ClockIcon, CheckCircleIcon, PlusCircleIcon, XCircleIcon, BanIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TournamentPlayersManagement from "@/components/admin/TournamentPlayersManagement";
import TournamentMatchesManagement from "@/components/admin/TournamentMatchesManagement";

const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tournaments");
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [tournamentLocation, setTournamentLocation] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 1),
  });
  const [categories, setCategories] = useState(["masculino", "feminino", "misto"]);
  const [newCategory, setNewCategory] = useState("");
  const [openTournamentDialog, setOpenTournamentDialog] = useState(false);
  
  const { data: tournaments, isLoading: isLoadingTournaments, refetch: refetchTournaments } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: async () => {
      return await getTournaments();
    }
  });

  const handleCreateTournament = async () => {
    if (!tournamentName || !tournamentLocation || !dateRange?.from || !dateRange?.to) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const tournamentData = {
        name: tournamentName,
        description: tournamentDescription,
        location: tournamentLocation,
        startDate: dateRange.from,
        endDate: dateRange.to || dateRange.from,
        categories: categories,
        status: dateRange.from > new Date() ? 'upcoming' : 'active' as 'upcoming' | 'active',
        participants: [],
        matches: [],
        createdBy: user?.uid || ""
      };

      await createTournament(tournamentData);
      
      toast({
        title: "Sucesso",
        description: "Campeonato criado com sucesso",
      });
      
      setTournamentName("");
      setTournamentDescription("");
      setTournamentLocation("");
      setDateRange({
        from: new Date(),
        to: addDays(new Date(), 1),
      });
      setCategories(["masculino", "feminino", "misto"]);
      
      setOpenTournamentDialog(false);
      
      refetchTournaments();
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o campeonato",
        variant: "destructive",
      });
    }
  };

  const resetTournamentForm = () => {
    setTournamentName("");
    setTournamentDescription("");
    setTournamentLocation("");
    setDateRange({
      from: new Date(),
      to: addDays(new Date(), 1),
    });
    setCategories(["masculino", "feminino", "misto"]);
    setOpenTournamentDialog(false);
  };

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(category => category !== categoryToRemove));
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Área Restrita</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Painel Administrativo</h1>
      
      <Tabs defaultValue="tournaments" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tournaments">Campeonatos</TabsTrigger>
          <TabsTrigger value="players">Jogadores</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gerenciar Campeonatos</h2>
            
            <Dialog open={openTournamentDialog} onOpenChange={setOpenTournamentDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircleIcon className="mr-1" />
                  Criar Novo Campeonato
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Campeonato</DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Nome*</label>
                    <Input 
                      id="name" 
                      value={tournamentName} 
                      onChange={(e) => setTournamentName(e.target.value)} 
                      placeholder="Nome do campeonato"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">Descrição</label>
                    <Textarea 
                      id="description" 
                      value={tournamentDescription} 
                      onChange={(e) => setTournamentDescription(e.target.value)} 
                      placeholder="Descrição do campeonato"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="location" className="text-sm font-medium">Local*</label>
                    <Input 
                      id="location" 
                      value={tournamentLocation} 
                      onChange={(e) => setTournamentLocation(e.target.value)} 
                      placeholder="Local do campeonato"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data*</label>
                    <div className="flex space-x-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal w-full",
                              !dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "P")} - {format(dateRange.to, "P")}
                                </>
                              ) : (
                                format(dateRange.from, "P")
                              )
                            ) : (
                              <span>Selecione a data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categorias</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                          <span className="text-sm">{category}</span>
                          <button 
                            onClick={() => handleRemoveCategory(category)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Input 
                        value={newCategory} 
                        onChange={(e) => setNewCategory(e.target.value)} 
                        placeholder="Nova categoria"
                      />
                      <Button type="button" onClick={handleAddCategory} variant="outline">
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="flex justify-end gap-2">
                  <Button 
                    variant="cancel" 
                    onClick={resetTournamentForm}
                  >
                    <XCircleIcon size={16} />
                    Cancelar
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={handleCreateTournament}
                  >
                    <CheckCircleIcon size={16} />
                    Criar Campeonato
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoadingTournaments ? (
            <div className="text-center py-10">
              <ClockIcon className="animate-spin h-8 w-8 mx-auto mb-4" />
              <p>Carregando campeonatos...</p>
            </div>
          ) : tournaments && tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament} 
                  onRefetch={refetchTournaments}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border rounded-lg bg-gray-50">
              <TrophyIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Nenhum campeonato encontrado</p>
              <p className="text-gray-400 text-sm">Crie um novo campeonato para começar.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="players">
          <PlayersList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TournamentCard = ({ tournament, onRefetch }: { tournament: Tournament, onRefetch: () => void }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("players");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();
  
  const handleCancelTournament = async () => {
    try {
      await updateTournamentStatus(tournament.id, 'cancelled');
      toast({
        title: "Campeonato cancelado",
        description: "O campeonato foi cancelado com sucesso.",
      });
      setShowCancelDialog(false);
      if (onRefetch) {
        onRefetch();
      }
    } catch (error) {
      console.error("Error canceling tournament:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o campeonato",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {tournament.name}
          <span className={cn(
            "text-xs font-medium rounded-full px-2 py-1",
            tournament.status === 'upcoming' ? "bg-blue-100 text-blue-800" :
            tournament.status === 'active' ? "bg-green-100 text-green-800" :
            tournament.status === 'cancelled' ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-800"
          )}>
            {tournament.status === 'upcoming' ? 'Próximo' :
             tournament.status === 'active' ? 'Em andamento' :
             tournament.status === 'cancelled' ? 'Cancelado' :
             'Finalizado'}
          </span>
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 text-sm mt-1">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(tournament.startDate), "dd/MM/yyyy")}
            {tournament.endDate && tournament.endDate !== tournament.startDate && 
              ` - ${format(new Date(tournament.endDate), "dd/MM/yyyy")}`}
          </div>
          <div className="text-sm mt-1">
            {tournament.location}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {tournament.categories.map((category) => (
            <span key={category} className="text-xs bg-gray-100 rounded-full px-2 py-1">
              {category}
            </span>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-500">
            <UsersIcon className="h-4 w-4 mr-1" />
            {tournament.participants.length} participantes
          </div>
          
          <div className="flex gap-2">
            {tournament.status === 'upcoming' && (
              <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <BanIcon className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você tem certeza que deseja cancelar este campeonato? 
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelTournament} className="bg-red-600 hover:bg-red-700">
                      Confirmar cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" onClick={() => setShowDetails(true)}>
              Gerenciar
            </Button>
          </div>
        </div>
        
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-[900px] h-[80vh]">
            <DialogHeader>
              <DialogTitle>Gerenciar: {tournament.name}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="players" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="players">Jogadores</TabsTrigger>
                <TabsTrigger value="matches">Partidas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="players" className="h-[calc(80vh-10rem)] overflow-y-auto">
                <TournamentPlayersManagement 
                  tournament={tournament} 
                  onRefetch={onRefetch} 
                />
              </TabsContent>
              
              <TabsContent value="matches" className="h-[calc(80vh-10rem)] overflow-y-auto">
                <TournamentMatchesManagement 
                  tournament={tournament}
                  onRefetch={onRefetch}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const PlayersList = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { data: tournaments } = useQuery({
    queryKey: ['tournaments-for-players'],
    queryFn: async () => await getTournaments()
  });
  
  const { data: allPlayers, isLoading } = useQuery({
    queryKey: ['admin-players'],
    queryFn: async () => {
      try {
        const uniquePlayerIds = new Set<string>();
        const playerProfiles: PlayerProfile[] = [];
        
        if (tournaments) {
          for (const tournament of tournaments) {
            for (const playerId of tournament.participants) {
              if (!uniquePlayerIds.has(playerId)) {
                uniquePlayerIds.add(playerId);
                const profile = await getPlayerProfile(playerId);
                if (profile) {
                  playerProfiles.push(profile);
                }
              }
            }
          }
        }
        
        return playerProfiles;
      } catch (error) {
        console.error("Error fetching players:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de jogadores",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!tournaments
  });
  
  const filteredPlayers = allPlayers?.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Gerenciar Jogadores</h2>
        
        <div className="relative">
          <Input
            className="pl-8 w-[300px]"
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
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">
          <ClockIcon className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p>Carregando jogadores...</p>
        </div>
      ) : filteredPlayers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Partidas</TableHead>
              <TableHead>Vitórias</TableHead>
              <TableHead>Derrotas</TableHead>
              <TableHead>Taxa de Vitória</TableHead>
              <TableHead>Campeonatos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow key={player.uid}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {player.name}
                    {player.isAdmin && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{player.email}</TableCell>
                <TableCell>{player.stats.matches}</TableCell>
                <TableCell>{player.stats.wins}</TableCell>
                <TableCell>{player.stats.losses}</TableCell>
                <TableCell>{player.stats.winRate.toFixed(1)}%</TableCell>
                <TableCell>
                  {tournaments ? (
                    tournaments.filter(t => 
                      t.participants.includes(player.uid)
                    ).length
                  ) : 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-10 border rounded-lg bg-gray-50">
          <UsersIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Nenhum jogador encontrado</p>
          {searchQuery && (
            <p className="text-gray-400 text-sm">Tente ajustar sua busca.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
