// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';

// Admin mode: determines which sidebar and data context is active
type AdminMode = 'restaurant' | 'agency';

// Define tipos para el contexto
interface AuthContextType {
  user: any | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  // Restaurant context (existing)
  currentRestaurant?: any;
  setCurrentRestaurant: (restaurant: any) => void;
  switchRestaurant: (restaurantId: string) => void;
  // Agency context (new — guidebook)
  currentAgency?: any;
  setCurrentAgency: (agency: any) => void;
  switchAgency: (agencyId: string) => void;
  // Admin mode switcher
  adminMode: AdminMode;
  setAdminMode: (mode: AdminMode) => void;
  hasRestaurants: boolean;
  hasAgencies: boolean;
}

// Crea el contexto con un valor inicial seguro
const AuthContext = createContext<AuthContextType | null>(null);

// Props para el proveedor
interface AuthProviderProps {
  children: ReactNode;
}

// Proveedor de autenticación como componente nombrado
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentRestaurant, setCurrentRestaurant] = useState<any>(
    JSON.parse(localStorage.getItem('current_restaurant') || 'null')
  );
  const [currentAgency, setCurrentAgency] = useState<any>(
    JSON.parse(localStorage.getItem('current_agency') || 'null')
  );
  const [adminMode, setAdminModeState] = useState<AdminMode>(
    (localStorage.getItem('admin_mode') as AdminMode) || 'restaurant'
  );

  // Persist admin mode
  const setAdminMode = (mode: AdminMode) => {
    setAdminModeState(mode);
    localStorage.setItem('admin_mode', mode);
  };

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (authToken) {
        try {
          // Configurar token en apiClient
          apiClient.setAuthToken(authToken);

          // Validar autenticación con el backend
          console.log("[AuthContext] Verificando token con el backend...");

          const response: any = await apiClient.getCurrentUser();
          const userData = response.user || response;

          if (userData) {
            console.log("[AuthContext] Token válido, usuario:", userData.email);
            setUser(userData);

            // Auto-seleccionar el primer restaurante si currentRestaurant no existe
            if (!currentRestaurant && userData.restaurants && userData.restaurants.length > 0) {
              setCurrentRestaurant(userData.restaurants[0]);
            }

            // Auto-seleccionar la primera agencia si currentAgency no existe
            if (!currentAgency && userData.agencies && userData.agencies.length > 0) {
              setCurrentAgency(userData.agencies[0]);
            }

            // If user only has agencies (no restaurants), auto-switch to agency mode
            const hasRest = userData.restaurants && userData.restaurants.length > 0;
            const hasAgen = userData.agencies && userData.agencies.length > 0;
            if (!hasRest && hasAgen) {
              setAdminMode('agency');
            }
          } else {
            throw new Error("Datos de usuario no encontrados en la respuesta");
          }

        } catch (error) {
          // Token inválido o expirado
          console.error("Error de autenticación:", error);

          // Limpiar estado y storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('current_restaurant');
          localStorage.removeItem('current_agency');
          localStorage.removeItem('admin_mode');
          setAuthToken(null);
          setUser(null);
          setCurrentRestaurant(null);
          setCurrentAgency(null);
          apiClient.clearAuthToken();
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [authToken]);

  // Guardar restaurante actual en localStorage cuando cambie
  useEffect(() => {
    if (currentRestaurant) {
      localStorage.setItem('current_restaurant', JSON.stringify(currentRestaurant));
    } else {
      localStorage.removeItem('current_restaurant');
    }
  }, [currentRestaurant]);

  // Guardar agencia actual en localStorage cuando cambie
  useEffect(() => {
    if (currentAgency) {
      localStorage.setItem('current_agency', JSON.stringify(currentAgency));
    } else {
      localStorage.removeItem('current_agency');
    }
  }, [currentAgency]);

  // Función de inicio de sesión
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);

      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        setAuthToken(response.token);

        // Guardar datos del usuario en localStorage
        if (response.user) {
          localStorage.setItem('user_data', JSON.stringify(response.user));
          setUser(response.user);

          // Auto-seleccionar el primer restaurante al hacer login
          if (response.user.restaurants && response.user.restaurants.length > 0) {
            setCurrentRestaurant(response.user.restaurants[0]);
          }

          // Auto-seleccionar la primera agencia al hacer login
          if (response.user.agencies && response.user.agencies.length > 0) {
            setCurrentAgency(response.user.agencies[0]);
          }

          // Auto-detect mode for agency-only users
          const hasRest = response.user.restaurants && response.user.restaurants.length > 0;
          const hasAgen = response.user.agencies && response.user.agencies.length > 0;
          if (!hasRest && hasAgen) {
            setAdminMode('agency');
          }
        }

        return response;
      }

      throw new Error('No se recibió token de autenticación');
    } catch (error) {
      console.error("Error de inicio de sesión:", error);
      throw error;
    }
  };

  // Función de cambio de restaurante
  const switchRestaurant = (restaurantId: string) => {
    if (user?.restaurants) {
      const restaurant = user.restaurants.find((r: any) => r.id === restaurantId);
      if (restaurant) {
        setCurrentRestaurant(restaurant);
      }
    }
  };

  // Función de cambio de agencia
  const switchAgency = (agencyId: string) => {
    if (user?.agencies) {
      const agency = user.agencies.find((a: any) => a.id === agencyId);
      if (agency) {
        setCurrentAgency(agency);
      }
    }
  };

  // Función de cierre de sesión
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_restaurant');
    localStorage.removeItem('current_agency');
    localStorage.removeItem('admin_mode');
    localStorage.removeItem('user_data');
    setAuthToken(null);
    setUser(null);
    setCurrentRestaurant(null);
    setCurrentAgency(null);
    setAdminModeState('restaurant');
    apiClient.clearAuthToken();
  };

  const hasRestaurants = !!(user?.restaurants && user.restaurants.length > 0);
  const hasAgencies = !!(user?.agencies && user.agencies.length > 0);

  // Crear valor del contexto
  const contextValue: AuthContextType = {
    user,
    authToken,
    isAuthenticated: !!authToken,
    isLoading,
    login,
    logout,
    currentRestaurant,
    setCurrentRestaurant,
    switchRestaurant,
    currentAgency,
    setCurrentAgency,
    switchAgency,
    adminMode,
    setAdminMode,
    hasRestaurants,
    hasAgencies,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto, definido como función nombrada
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}