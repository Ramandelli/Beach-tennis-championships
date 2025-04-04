
import { useEffect, useState } from "react";
import { getPlayerRanking, PlayerProfile } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trophy, Search, ChevronUp, ChevronDown, Minus, RefreshCw } from "lucide-react";

const Ranking = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchRanking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching player ranking...");
      const data = await getPlayerRanking(100);
      console.log(`Fetched ${data.length} players for ranking`);
      setPlayers(data);
      setFilteredPlayers(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching ranking:", error);
      setError("Não foi possível carregar o ranking. Tente novamente mais tarde.");
      toast({
        title: "Erro",
        description: "Não foi possível carregar o ranking. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, [toast]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPlayers(players);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = players.filter(player => 
        player.name.toLowerCase().includes(term)
      );
      setFilteredPlayers(filtered);
    }
  }, [searchTerm, players]);

  const getTrophyColor = (position: number) => {
    switch (position) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-700";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ranking de Jogadores</h1>
        {error && (
          <Button 
            onClick={fetchRanking} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar jogador por nome..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-sm">Posição</th>
                <th className="px-4 py-3 text-left font-medium text-sm">Jogador</th>
                <th className="px-4 py-3 text-center font-medium text-sm">Partidas</th>
                <th className="px-4 py-3 text-center font-medium text-sm">Vitórias</th>
                <th className="px-4 py-3 text-center font-medium text-sm">Derrotas</th>
                <th className="px-4 py-3 text-center font-medium text-sm">Taxa de Vitória</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Trophy className="h-12 w-12 animate-pulse text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Carregando ranking...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <p className="text-destructive font-medium mb-2">{error}</p>
                      <Button onClick={fetchRanking} variant="outline" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Tentar novamente
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredPlayers.length > 0 ? (
                filteredPlayers.map((player, index) => (
                  <tr key={player.uid} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className="font-bold">{index + 1}</span>
                        {index < 3 && (
                          <Trophy 
                            className={`ml-2 h-4 w-4 ${getTrophyColor(index)}`} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={player.avatarUrl} alt={player.name} />
                          <AvatarFallback className="bg-beach-blue text-white">
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{player.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{player.stats.matches}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600">{player.stats.wins}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-red-600">{player.stats.losses}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        {player.stats.winRate > 0 ? (
                          <ChevronUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : player.stats.winRate < 0 ? (
                          <ChevronDown className="h-4 w-4 text-red-600 mr-1" />
                        ) : (
                          <Minus className="h-4 w-4 text-gray-400 mr-1" />
                        )}
                        <span className="font-medium">{player.stats.winRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">Nenhum jogador encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Não foi possível encontrar jogadores com este nome.
                    </p>
                    <Button onClick={() => setSearchTerm("")}>
                      Limpar busca
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Ranking;
