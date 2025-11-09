import { createContext, useContext, useEffect, useState } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { db, type User } from "@/lib/db";

interface AuthContextType {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!clerkLoaded) return;

      if (clerkUser) {
        // User is signed in with Clerk, sync with local DB
        const clerkId = clerkUser.id;
        let dbUser = await db.getUserByClerkId(clerkId);

        if (!dbUser) {
          // Create new user in local DB
          dbUser = await db.createUser({
            name: clerkUser.fullName || clerkUser.firstName || "用户",
            email: clerkUser.primaryEmailAddress?.emailAddress,
            clerkId,
          });
          localStorage.setItem("currentUserId", dbUser.id);
        } else {
          localStorage.setItem("currentUserId", dbUser.id);
        }

        setUser(dbUser);
      } else {
        // User is not signed in, use guest mode
        setUser(null);
        localStorage.removeItem("currentUserId");
      }

      setIsLoaded(true);
    };

    syncUser();
  }, [clerkUser, clerkLoaded]);

  const signOut = async () => {
    await clerkSignOut();
    setUser(null);
    
    // Clear all user-specific data from localStorage
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentConversationId");
    localStorage.removeItem("personalityConfig");
    localStorage.removeItem("userApiConfig");
    
    // Clear all data arrays (conversations, messages, memories, diaries, etc.)
    localStorage.removeItem("users");
    localStorage.removeItem("conversations");
    localStorage.removeItem("messages");
    localStorage.removeItem("memories");
    localStorage.removeItem("diaryEntries");
    localStorage.removeItem("userSettings");
    
    // Keep admin config and other system-level settings
    // localStorage.removeItem("adminConfig"); // Keep this
    
    // Note: Group data is kept as it may be shared between users
    // If you want to clear it as well, uncomment the following:
    // localStorage.removeItem("groups");
    // localStorage.removeItem("groupMembers");
    // localStorage.removeItem("groupMessages");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: !!user,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
