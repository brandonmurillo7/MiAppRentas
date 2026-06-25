import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import { Alert } from 'react-native';

export type AuthRole = 'member' | 'seller';

export interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  role: AuthRole;
  sellerSince: string | null;
  sellerRating: number;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  identityDocument: string;
  countryCode: string;
  phone: string;
  email: string;
  password: string;
  role?: AuthRole;
  interestType?: 'rent' | 'buy' | 'both';
}

interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  signUp: (payload: SignUpPayload) => Promise<boolean>;
  signIn: (identifier: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const normalizePhone = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.startsWith('+')) {
      return `+${trimmed.slice(1).replace(/\D/g, '')}`;
    }
    return `+${trimmed.replace(/\D/g, '')}`;
  };

  const mapRole = (value: unknown, fallback: AuthRole = 'member'): AuthRole => {
    if (value === 'seller' || value === 'member') {
      return value;
    }
    return fallback;
  };

  const normalizeRating = (value: unknown): number => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return 0;
    }
    if (numeric < 0) {
      return 0;
    }
    if (numeric > 5) {
      return 5;
    }
    return numeric;
  };

  const setUserFromSession = (session: any, fallbackRole: AuthRole = 'member') => {
    const email = session?.user?.email;
    if (!email) {
      setUser(null);
      return;
    }
    const role = mapRole(session?.user?.user_metadata?.role, fallbackRole);
    const firstName = (session?.user?.user_metadata?.first_name || '').toString().trim();
    const lastName = (session?.user?.user_metadata?.last_name || '').toString().trim();
    const sellerSince = role === 'seller'
      ? (session?.user?.user_metadata?.seller_since || session?.user?.created_at || null)
      : null;
    const sellerRating = role === 'seller'
      ? normalizeRating(session?.user?.user_metadata?.seller_rating)
      : 0;

    setUser({
      email,
      firstName,
      lastName,
      role,
      sellerSince,
      sellerRating,
    });
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('getSession error', error.message);
        return;
      }
      setUserFromSession(data.session);
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserFromSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (payload: SignUpPayload) => {
    const role = payload.role || 'member';
    const phoneWithCountryCode = `${payload.countryCode}${payload.phone}`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            role,
            interest_type: role === 'member' ? payload.interestType || null : null,
            first_name: payload.firstName,
            last_name: payload.lastName,
            identity_document: payload.identityDocument,
            phone: phoneWithCountryCode,
            phone_country_code: payload.countryCode,
            seller_since: role === 'seller' ? new Date().toISOString() : null,
            seller_rating: role === 'seller' ? 0 : null,
          },
        },
      });

      if (error) {
        console.warn('Supabase signUp error', error.message);
        Alert.alert('Error de registro', error.message);
        return false;
      }

      const { error: phoneIndexError } = await supabase
        .from('user_phone_login')
        .upsert(
          {
            email: payload.email.toLowerCase(),
            phone_e164: normalizePhone(phoneWithCountryCode),
            created_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );

      if (phoneIndexError) {
        console.warn('user_phone_login upsert error', phoneIndexError.message);
      }

      if (data.session) {
        await supabase.auth.signOut();
        setUser(null);
        Alert.alert('Registro exitoso', 'Tu cuenta fue creada. Ahora inicia sesión con tu correo y contraseña.');
      } else {
        Alert.alert('Registro creado', 'Tu cuenta fue creada. Revisa tu correo para confirmar y luego inicia sesión.');
      }

      return true;
    } catch (err) {
      console.warn('signUp exception', err);
      Alert.alert('Error', 'No se pudo completar el registro.');
      return false;
    }
  };

  const signIn = async (identifier: string, password: string) => {
    try {
      const trimmedIdentifier = identifier.trim();
      const isEmailLogin = trimmedIdentifier.includes('@');
      let emailToUse = trimmedIdentifier.toLowerCase();

      if (!isEmailLogin) {
        const normalizedPhone = normalizePhone(trimmedIdentifier);
        const { data: phoneData, error: phoneError } = await supabase
          .from('user_phone_login')
          .select('email')
          .eq('phone_e164', normalizedPhone)
          .maybeSingle();

        if (phoneError) {
          console.warn('phone lookup error', phoneError.message);
          Alert.alert('Error', 'No se pudo validar el número de teléfono.');
          return false;
        }

        if (!phoneData?.email) {
          Alert.alert('No encontrado', 'No existe una cuenta asociada a ese teléfono.');
          return false;
        }

        emailToUse = phoneData.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) {
        console.warn('Supabase signIn error', error.message);
        Alert.alert('Error', error.message);
        return false;
      }
      setUserFromSession(data.session, 'member');
      return true;
    } catch (err) {
      console.warn('signIn exception', err);
      Alert.alert('Error', 'Error conectando con el servidor');
      return false;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('signOut exception', err);
      Alert.alert('Error', 'No se pudo cerrar sesión totalmente.');
    }
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      theme,
      signUp,
      signIn,
      signOut,
      toggleTheme,
    }),
    [user, theme]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
