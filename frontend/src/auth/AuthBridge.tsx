import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { setAuthTokenProvider } from "../api/client";

export function AuthBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(async () => {
      if (!isLoaded || !isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}
