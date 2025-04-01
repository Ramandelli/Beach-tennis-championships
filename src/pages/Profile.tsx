import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { updatePlayerProfile, uploadAvatar } from "@/lib/firebase";
import { Camera, Loader2, UserCog, Award, Trophy, ThumbsUp, ThumbsDown, Edit, Save, X, Target, Activity, Star, Clock } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Profile = () => {
  const { user, playerProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("Profile component - received playerProfile:", playerProfile);
    if (playerProfile) {
      setName(playerProfile.name || "");
      setAge(playerProfile.age ? playerProfile.age.toString() : "");
      setGender(playerProfile.gender || "");
      setAvatarPreview(playerProfile.avatarUrl || null);
    }
  }, [playerProfile]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("O arquivo é muito grande. O tamanho máximo é 2MB.");
        return;
      }
      
      // Check file type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        setUploadError("Formato de arquivo não suportado. Use JPG, PNG, GIF ou WebP.");
        return;
      }
      
      // Reset any previous errors
      setUploadError(null);
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      console.log("Avatar file selected:", file.name, file.type, file.size);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setLoading(true);
    setUploadError(null);
    
    try {
      // Prepare profile data object
      const profileData: { name?: string; age?: number; gender?: string } = {};
      
      // Always include these fields if they have values
      if (name) {
        profileData.name = name;
      }
      
      if (age) {
        profileData.age = parseInt(age);
      }
      
      if (gender) {
        profileData.gender = gender;
      }
      
      console.log("Updating profile with data:", profileData);
      
      if (Object.keys(profileData).length > 0) {
        await updatePlayerProfile(user.uid, profileData);
      }
      
      // Upload avatar if changed
      if (avatar) {
        console.log("Starting avatar upload process...");
        try {
          const avatarUrl = await uploadAvatar(user.uid, avatar);
          console.log("Avatar upload completed successfully, URL:", avatarUrl);
          
          // Force refresh the avatar preview with the new URL to avoid caching issues
          if (avatarUrl) {
            setAvatarPreview(`${avatarUrl}?t=${Date.now()}`);
          }
        } catch (avatarError: any) {
          console.error("Error uploading avatar:", avatarError);
          setUploadError(avatarError.message || "Não foi possível enviar a imagem. Tente novamente mais tarde ou use outro arquivo.");
          throw avatarError; // Rethrow to handle in the outer catch
        }
      }
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      // Exit edit mode after successful update
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const cancelEdit = () => {
    // Reset form values to current profile values
    if (playerProfile) {
      setName(playerProfile.name || "");
      setAge(playerProfile.age ? playerProfile.age.toString() : "");
      setGender(playerProfile.gender || "");
      setAvatarPreview(playerProfile.avatarUrl || null);
    }
    setAvatar(null);
    setIsEditing(false);
  };
  
  console.log("Rendering profile component with playerProfile:", playerProfile);
  
  if (!user) {
    console.log("No user, redirecting to login");
    navigate("/login");
    return null;
  }
  
  if (authLoading || !playerProfile) {
    console.log("Loading or no player profile yet");
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-beach-blue mb-4" />
        <p className="text-lg">Carregando informações do perfil...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        {!isEditing && (
          <Button 
            onClick={() => setIsEditing(true)} 
            className="bg-beach-blue hover:bg-beach-blue/90"
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
        )}
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Stats - Always visible */}
        <div className={isEditing ? "md:col-span-1" : "md:col-span-3 lg:col-span-3 xl:col-span-3"}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="mr-2 h-5 w-5 text-beach-blue" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-6">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={playerProfile.avatarUrl} alt={playerProfile.name} />
                  <AvatarFallback className="bg-beach-blue text-white text-4xl">
                    {playerProfile.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{playerProfile.name}</h2>
                <p className="text-muted-foreground">{playerProfile.email}</p>
                {playerProfile.age && (
                  <p className="text-sm text-muted-foreground">Idade: {playerProfile.age} anos</p>
                )}
                {playerProfile.gender && (
                  <p className="text-sm text-muted-foreground">
                    Gênero: {
                      playerProfile.gender === 'masculino' ? 'Masculino' :
                      playerProfile.gender === 'feminino' ? 'Feminino' :
                      playerProfile.gender === 'outro' ? 'Outro' : 
                      'Prefiro não informar'
                    }
                  </p>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Win Rate */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Taxa de Vitória</span>
                    <span className="text-sm font-medium">{playerProfile.stats?.winRate?.toFixed(1) || "0.0"}%</span>
                  </div>
                  <Progress value={playerProfile.stats?.winRate || 0} className="h-2" />
                </div>
                
                {/* New Metric: Consistency Score */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Consistência</span>
                    <span className="text-sm font-medium">{playerProfile.stats?.consistencyScore?.toFixed(1) || "0.0"}%</span>
                  </div>
                  <Progress value={playerProfile.stats?.consistencyScore || 0} className="h-2" />
                </div>
                
                {/* Basic Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-green-600">
                      <ThumbsUp className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.wins || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Vitórias</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-red-600">
                      <ThumbsDown className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.losses || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Derrotas</p>
                  </div>
                </div>
                
                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-amber-500">
                      <Trophy className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.tournaments || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Campeonatos</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-purple-600">
                      <Star className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.podiums || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Pódios</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-blue-600">
                      <Target className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.aces || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Aces</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1 text-orange-500">
                      <Activity className="h-5 w-5 mr-1" />
                      <span className="font-bold text-lg">{playerProfile.stats?.winningStreak || 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Sequência</p>
                  </div>
                </div>
                
                {/* Total Matches at the bottom */}
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-5 w-5 mr-1 text-beach-blue" />
                    <span className="font-bold text-lg">{playerProfile.stats?.matches || 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total de Partidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Edit Profile - Only visible when editing */}
        {isEditing && (
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCog className="mr-2 h-5 w-5 text-beach-blue" />
                  Editar Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Erro ao enviar imagem</AlertTitle>
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="avatar">Foto de Perfil</Label>
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={avatarPreview || undefined} alt={name} />
                          <AvatarFallback className="bg-beach-blue text-white">
                            {name.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Label 
                            htmlFor="avatar-upload" 
                            className="cursor-pointer inline-flex items-center bg-muted px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Alterar foto
                          </Label>
                          <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            JPG, PNG ou GIF. Máximo 2MB.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Idade</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="Idade"
                          min="1"
                          max="120"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gênero</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                            <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={cancelEdit}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-beach-blue hover:bg-beach-blue/90"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
