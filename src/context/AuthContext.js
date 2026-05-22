import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getSecure, setSecure, clearSecure } from '../security/secureStorage';
import { verifyToken, tokenExpiresInSec } from '../security/jwt';
import * as tokenStore from '../security/tokenStore';
import { authApi } from '../api';

const TOKEN_KEY = 'louagi.accessToken';
const REFRESH_KEY = 'louagi.refreshToken';
const USER_KEY = 'louagi.user';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (next) => {
    if (!next) {
      await Promise.all([clearSecure(TOKEN_KEY), clearSecure(REFRESH_KEY), clearSecure(USER_KEY)]);
      return;
    }
    const { accessToken: a, refreshToken: r, user: u } = next;
    await Promise.all([
      a ? setSecure(TOKEN_KEY, a) : clearSecure(TOKEN_KEY),
      r ? setSecure(REFRESH_KEY, r) : clearSecure(REFRESH_KEY),
      u ? setSecure(USER_KEY, u) : clearSecure(USER_KEY),
    ]);
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    tokenStore.clearTokens();
    await persist(null);
  }, [persist]);

  const applySession = useCallback(
    async ({ accessToken: a, refreshToken: r, user: u }) => {
      setAccessToken(a);
      setRefreshToken(r);
      setUser(u);
      tokenStore.setTokens({ access: a, refresh: r });
      await persist({ accessToken: a, refreshToken: r, user: u });
    },
    [persist]
  );

  // Boot: load tokens from secure store
  useEffect(() => {
    (async () => {
      try {
        await authApi.ensureReady();
        const [a, r, u] = await Promise.all([
          getSecure(TOKEN_KEY),
          getSecure(REFRESH_KEY),
          getSecure(USER_KEY),
        ]);
        if (a && (await verifyToken(a))) {
          setAccessToken(a);
          setRefreshToken(r);
          setUser(u);
          tokenStore.setTokens({ access: a, refresh: r });
        } else if (r) {
          const res = await authApi.refresh(r);
          if (res.ok) {
            await applySession({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: u });
          } else {
            await persist(null);
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, [applySession, persist]);

  // Reactive 401 refreshes inside http.js update tokenStore directly.
  // Mirror those changes back into React state + secure storage so the
  // soft-refresh timer keeps using the current pair (and so signing out
  // from inside http.js on refresh failure surfaces as a real signOut).
  useEffect(() => {
    return tokenStore.subscribe(({ accessToken: a, refreshToken: r }) => {
      setAccessToken((prev) => (prev === a ? prev : a));
      setRefreshToken((prev) => (prev === r ? prev : r));
      if (!a && !r) {
        setUser(null);
        clearSecure(TOKEN_KEY);
        clearSecure(REFRESH_KEY);
        clearSecure(USER_KEY);
      } else {
        if (a) setSecure(TOKEN_KEY, a);
        if (r) setSecure(REFRESH_KEY, r);
      }
    });
  }, []);

  // Soft refresh before expiry
  useEffect(() => {
    if (!accessToken || !refreshToken) return;
    const exp = tokenExpiresInSec(accessToken);
    const ms = Math.max(5, exp - 60) * 1000;
    const t = setTimeout(async () => {
      const res = await authApi.refresh(refreshToken);
      if (res.ok) {
        await applySession({ accessToken: res.accessToken, refreshToken: res.refreshToken, user });
      } else {
        await signOut();
      }
    }, ms);
    return () => clearTimeout(t);
  }, [accessToken, refreshToken, user, applySession, signOut]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      ready,
      isAuthed: !!user && !!accessToken,
      applySession,
      signOut,
      setUser: async (u) => {
        setUser(u);
        await setSecure(USER_KEY, u);
      },
    }),
    [user, accessToken, refreshToken, ready, applySession, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
};
