
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getTournaments, Tournament, getPlayerRanking, PlayerProfile } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Calendar, Shield, User } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";

const Index = () => {
  const { user } = useAuth();
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournaments, players] = await Promise.all([
          getTournaments('active'),
          getPlayerRanking(3)
        ]);
        
        setActiveTournaments(tournaments.slice(0, 3));
        setTopPlayers(players);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-beach-sand/20 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold mb-4 beach-text-gradient"
          >
            Beach Tennis Championship
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-gray-700"
          >
            Os melhores campeonatos de Beach Tennis de Cianorte!
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            {user ? (
              <Button className="bg-beach-blue hover:bg-beach-blue/90" size="lg" asChild>
                <Link to="/tournaments">Ver Campeonatos</Link>
              </Button>
            ) : (
              <>
                <Button className="bg-beach-blue hover:bg-beach-blue/90" size="lg" asChild>
                  <Link to="/register">Cadastre-se</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="bg-beach-blue/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-beach-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Crie seu perfil</h3>
              <p className="text-gray-600">
                Cadastre-se e mantenha seu perfil atualizado com suas estatísticas e conquistas.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="bg-beach-blue/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-beach-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Encontre campeonatos</h3>
              <p className="text-gray-600">
                Explore os campeonatos disponíveis e inscreva-se nos que mais combinam com você.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="bg-beach-blue/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-beach-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acompanhe o ranking</h3>
              <p className="text-gray-600">
                Participe dos torneios e suba no ranking dos melhores jogadores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tournaments Section */}
      {activeTournaments.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Campeonatos Ativos</h2>
              <Button variant="outline" asChild>
                <Link to="/tournaments">Ver todos</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Players Section */}
      {topPlayers.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Top Jogadores</h2>
              <Button variant="outline" asChild>
                <Link to="/ranking">Ver ranking completo</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {topPlayers.map((player, index) => (
                <div key={player.uid} className="bg-gray-50 rounded-lg p-6 flex items-center">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full overflow-hidden border-4 ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-300' : 'border-orange-700'}`}>
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-beach-blue flex items-center justify-center text-white text-xl font-bold">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-2 -left-2 bg-beach-blue w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-lg">{player.name}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Shield className="h-4 w-4 mr-1" />
                      <span>{player.stats.wins} vitórias</span>
                    </div>
                    <div className="text-sm font-medium">
                      Taxa de vitória: {player.stats.winRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
