import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  kycStatus: "pending" | "submitted" | "approved" | "rejected";
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let _tokenGetter: (() => string | null) = () => null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => _tokenGetter());
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem("@novapay_token"),
        AsyncStorage.getItem("@novapay_user"),
      ]);
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
        _tokenGetter = () => storedToken;
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    await Promise.all([
      AsyncStorage.setItem("@novapay_token", newToken),
      AsyncStorage.setItem("@novapay_user", JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
    _tokenGetter = () => newToken;
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem("@novapay_token"),
      AsyncStorage.removeItem("@novapay_user"),
    ]);
    setToken(null);
    setUser(null);
    _tokenGetter = () => null;
    router.replace("/(auth)/login");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem("@novapay_user", JSON.stringify(updatedUser)).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
