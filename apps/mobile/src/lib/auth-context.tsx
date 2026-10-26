import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthenticatedUser, LoginInput, RegisterInput } from '@immo/shared';
import { apiRequest } from './api';

const TOKEN_KEY = 'immo_session_token';

type SessionResponse = {
  user: AuthenticatedUser;
  expiresAt: string;
  token?: string;
};

type AuthState = {
  user: AuthenticatedUser | null;
  token: string | null;
  loading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const stored = await readToken();
    if (!stored) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const session = await apiRequest<{ user: AuthenticatedUser }>('/auth/me', {
        token: stored,
      });
      setToken(stored);
      setUser(session.user);
    } catch {
      await writeToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const signIn = useCallback(async (input: LoginInput) => {
    const session = await apiRequest<SessionResponse>('/auth/login', {
      method: 'POST',
      body: input,
    });
    if (!session.token) throw new Error('Jeton de session absent dans la réponse.');
    await writeToken(session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const session = await apiRequest<SessionResponse>('/auth/register', {
      method: 'POST',
      body: input,
    });
    if (!session.token) throw new Error('Jeton de session absent dans la réponse.');
    await writeToken(session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST', token }).catch(() => undefined);
    }
    await writeToken(null);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, signIn, signUp, signOut, reload }),
    [user, token, loading, signIn, signUp, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}

export async function getStoredToken(): Promise<string | null> {
  return readToken();
}
