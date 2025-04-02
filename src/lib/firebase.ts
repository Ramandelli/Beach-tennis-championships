import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8OlDcmVm9x8QmEdn8617a0TUZC_WkYVc",
  authDomain: "beefundmural.firebaseapp.com",
  projectId: "beefundmural",
  storageBucket: "beefundmural.appspot.com",
  messagingSenderId: "464124213506",
  appId: "1:464124213506:web:be57f2c462e7cc92af6a1b",
  measurementId: "G-NC627YE8VJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Types
export interface PlayerProfile {
  uid: string;
  email: string;
  name: string;
  age?: number;
  gender?: string;
  avatarUrl?: string;
  createdAt: Date;
  stats: {
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
    tournaments?: number;     // Number of tournaments participated in
    podiums?: number;         // Number of times on the podium (1st, 2nd, 3rd place)
    aces?: number;            // Number of aces served
    winningStreak?: number;   // Current or highest winning streak
    consistencyScore?: number; // Percentage score of consistency (can be calculated various ways)
  };
  isAdmin?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  status: 'upcoming' | 'active' | 'completed';
  categories: string[]; // e.g. ["masculino", "feminino", "misto"]
  participants: string[]; // UIDs of registered players
  matches: Match[];
  createdBy: string;
  createdAt: Date;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string; // e.g. "quarter-final", "semi-final", "final"
  category: string;
  team1: string[]; // Player UIDs
  team2: string[]; // Player UIDs
  score?: string; // e.g. "6-4, 7-5"
  winner?: string[]; // UIDs of winner team
  date: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Auth functions
export const signUp = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, { displayName: name });
    
    // Create player profile
    const playerProfile: PlayerProfile = {
      uid: user.uid,
      email: user.email || email,
      name: name,
      createdAt: new Date(),
      stats: {
        matches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        tournaments: 0,
        podiums: 0,
        aces: 0,
        winningStreak: 0,
        consistencyScore: 0
      }
    };
    
    await setDoc(doc(db, "players", user.uid), playerProfile);
    
    return { user, playerProfile };
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Player profile functions
export const getPlayerProfile = async (uid: string) => {
  try {
    const playerDoc = await getDoc(doc(db, "players", uid));
    if (playerDoc.exists()) {
      return playerDoc.data() as PlayerProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting player profile:", error);
    throw error;
  }
};

export const updatePlayerProfile = async (uid: string, data: Partial<PlayerProfile>) => {
  try {
    console.log(`Updating profile for user ${uid} with data:`, data);
    await updateDoc(doc(db, "players", uid), data);
    console.log("Profile updated successfully");
  } catch (error) {
    console.error("Error updating player profile:", error);
    throw error;
  }
};

export const uploadAvatar = async (uid: string, file: File) => {
  try {
    console.log(`Starting avatar upload for user ${uid}`);
    console.log(`File details: name=${file.name}, type=${file.type}, size=${file.size} bytes`);
    
    // Check if the file is actually an image
    if (!file.type.startsWith('image/')) {
      console.error("File is not an image:", file.type);
      throw new Error("O arquivo não é uma imagem válida");
    }
    
    // Create a reference with a unique timestamp to avoid cache issues
    const timestamp = Date.now();
    const filename = `${uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `avatars/${filename}`);
    
    console.log(`Storage reference created: avatars/${filename}`);
    
    // Upload the file with metadata
    const metadata = {
      contentType: file.type,
    };
    
    try {
      console.log("Starting upload with metadata:", metadata);
      const uploadResult = await uploadBytes(storageRef, file, metadata);
      console.log("File uploaded successfully:", uploadResult);
      
      // Wait a moment before getting the download URL (sometimes Firebase needs a moment)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the download URL
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", downloadURL);
      
      // Update player profile with avatar URL
      console.log("Updating player profile with avatar URL...");
      await updatePlayerProfile(uid, { avatarUrl: downloadURL });
      console.log("Profile updated with new avatar URL");
      
      return downloadURL;
    } catch (storageError: any) {
      if (storageError.code === 'storage/unauthorized') {
        console.error("Storage permission denied. Please check Firebase Storage rules.");
        throw new Error("Permissão negada no Firebase Storage. Entre em contato com o administrador para configurar as regras de acesso.");
      } else {
        throw storageError;
      }
    }
  } catch (error: any) {
    console.error("Error in uploadAvatar function:", error);
    
    // Log more details if it's a Firebase storage error
    if (error.code) {
      console.error("Firebase error code:", error.code);
      console.error("Firebase error message:", error.message);
    }
    
    throw error;
  }
};

// Tournament functions
export const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'createdAt'>) => {
  try {
    const tournamentsRef = collection(db, "tournaments");
    const newTournamentRef = doc(tournamentsRef);
    
    const tournament: Tournament = {
      ...tournamentData,
      id: newTournamentRef.id,
      createdAt: new Date(),
      matches: []
    };
    
    await setDoc(newTournamentRef, tournament);
    return tournament;
  } catch (error) {
    console.error("Error creating tournament:", error);
    throw error;
  }
};

export const getTournaments = async (status?: 'upcoming' | 'active' | 'completed') => {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, "tournaments"), 
        where("status", "==", status),
        orderBy("startDate", "asc")
      );
    } else {
      q = query(
        collection(db, "tournaments"),
        orderBy("startDate", "asc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    const tournaments: Tournament[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      // Convert Firestore timestamps to Date objects
      const tournament = {
        ...data,
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
      } as Tournament;
      tournaments.push(tournament);
    });
    
    return tournaments;
  } catch (error) {
    console.error("Error getting tournaments:", error);
    throw error;
  }
};

export const registerPlayerForTournament = async (tournamentId: string, playerId: string) => {
  try {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error("Tournament not found");
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    if (tournament.participants.includes(playerId)) {
      throw new Error("Player already registered for this tournament");
    }
    
    const participants = [...tournament.participants, playerId];
    
    await updateDoc(tournamentRef, { participants });
    
    return { success: true };
  } catch (error) {
    console.error("Error registering player for tournament:", error);
    throw error;
  }
};

// Match functions
export const createMatch = async (matchData: Omit<Match, 'id'>) => {
  try {
    const matchesRef = collection(db, "matches");
    const newMatchRef = doc(matchesRef);
    
    const match: Match = {
      ...matchData,
      id: newMatchRef.id
    };
    
    await setDoc(newMatchRef, match);
    
    // Add the match to the tournament
    const tournamentRef = doc(db, "tournaments", matchData.tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      const tournament = tournamentDoc.data() as Tournament;
      const matches = [...tournament.matches, match];
      await updateDoc(tournamentRef, { matches });
    }
    
    return match;
  } catch (error) {
    console.error("Error creating match:", error);
    throw error;
  }
};

export const updateMatchResult = async (matchId: string, score: string, winner: string[]) => {
  try {
    const matchRef = doc(db, "matches", matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      throw new Error("Match not found");
    }
    
    const match = matchDoc.data() as Match;
    
    await updateDoc(matchRef, { 
      score, 
      winner,
      status: 'completed' 
    });
    
    // Update player stats
    const winnerIds = winner;
    const loserIds = match.team1.includes(winnerIds[0]) ? match.team2 : match.team1;
    
    // Update winners' stats
    for (const playerId of winnerIds) {
      const playerRef = doc(db, "players", playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const player = playerDoc.data() as PlayerProfile;
        const matches = player.stats.matches + 1;
        const wins = player.stats.wins + 1;
        const winRate = (wins / matches) * 100;
        
        await updateDoc(playerRef, { 
          "stats.matches": matches,
          "stats.wins": wins,
          "stats.winRate": winRate
        });
      }
    }
    
    // Update losers' stats
    for (const playerId of loserIds) {
      const playerRef = doc(db, "players", playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const player = playerDoc.data() as PlayerProfile;
        const matches = player.stats.matches + 1;
        const losses = player.stats.losses + 1;
        const winRate = (player.stats.wins / matches) * 100;
        
        await updateDoc(playerRef, { 
          "stats.matches": matches,
          "stats.losses": losses,
          "stats.winRate": winRate
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating match result:", error);
    throw error;
  }
};

// Ranking functions
export const getPlayerRanking = async (limit = 20) => {
  try {
    const q = query(
      collection(db, "players"),
      orderBy("stats.winRate", "desc"),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    const players: PlayerProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      players.push(doc.data() as PlayerProfile);
    });
    
    return players;
  } catch (error) {
    console.error("Error getting player ranking:", error);
    throw error;
  }
};

export const getTournamentById = async (tournamentId: string): Promise<Tournament | null> => {
  try {
    const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));
    
    if (tournamentDoc.exists()) {
      const tournamentData = tournamentDoc.data() as Omit<Tournament, "id">;
      
      // Convert Firestore timestamps to JavaScript Date objects
      const tournament: Tournament = {
        ...tournamentData,
        id: tournamentDoc.id,
        startDate: tournamentData.startDate instanceof Timestamp 
          ? tournamentData.startDate.toDate() 
          : new Date(tournamentData.startDate),
        endDate: tournamentData.endDate instanceof Timestamp 
          ? tournamentData.endDate.toDate() 
          : new Date(tournamentData.endDate),
        matches: tournamentData.matches?.map(match => ({
          ...match,
          date: match.date instanceof Timestamp 
            ? match.date.toDate() 
            : match.date ? new Date(match.date) : undefined
        })) || []
      };
      
      return tournament;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting tournament by ID:", error);
    throw error;
  }
};

export { auth, db, storage, doc, updateDoc, collection, query, where, getDocs };
