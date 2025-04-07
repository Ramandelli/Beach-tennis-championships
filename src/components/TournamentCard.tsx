import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tournament } from "@/lib/firebase";
import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface TournamentCardProps {
  tournament: Tournament;
  isRegistered?: boolean;
  onRegister?: () => void;
  loading?: boolean;
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'upcoming':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Desconhecido';
  }
};

const TournamentCard = ({ tournament, isRegistered, onRegister, loading }: TournamentCardProps) => {
  const { user, isAdmin } = useAuth();
  const canBeManaged = tournament.status === 'upcoming' || tournament.status === 'active';

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{tournament.name}</CardTitle>
          <Badge className={`${getStatusColor(tournament.status)} ml-2`}>
            {getStatusText(tournament.status)}
          </Badge>
        </div>
        <CardDescription className="flex items-center mt-1">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          {tournament.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex-grow">
        <p className="text-sm text-gray-600 mb-3">{tournament.description}</p>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-beach-blue" />
            <span>
              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 text-beach-blue" />
            <span>{tournament.participants.length} participantes</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {tournament.categories.map((category) => (
              <Badge key={category} variant="outline" className="bg-muted">
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col gap-2 w-full">
        {user && !isAdmin && (tournament.status === 'upcoming' || tournament.status === 'active') && (
          isRegistered ? (
            <Button disabled className="w-full bg-green-500 hover:bg-green-600">
              Inscrito
            </Button>
          ) : (
            <Button 
              onClick={onRegister} 
              className="w-full bg-beach-blue hover:bg-beach-blue/90"
              disabled={loading}
            >
              {loading ? "Processando..." : "Inscrever-se"}
            </Button>
          )
        )}
        <Button asChild className="w-full" variant="outline">
          <Link to={`/tournaments/${tournament.id}`}>
            Ver detalhes
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TournamentCard;
