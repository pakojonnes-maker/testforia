// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';

// Define tipos para el contexto
interface AuthContextType {
  user: any | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  currentRestaurant?: any;
  setCurrentRestaurant: (restaurant: any) => void;
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

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (authToken) {
        try {
          // Configurar token en apiClient
          apiClient.setAuthToken(authToken);
          
          // Validar autenticación
          // Nota: Como getCurrentUser no está disponible, usamos isAuthenticated o alguna otra verificación
          if (!apiClient.isAuthenticated()) {
            throw new Error("Token inválido");
          }
          
          // En ausencia de getCurrentUser, podríamos recuperar datos del usuario
          // desde localStorage o usar un token decodificado
          const storedUserData = localStorage.getItem('user_data');
          if (storedUserData) {
            setUser(JSON.parse(storedUserData));
          }
          
        } catch (error) {
          // Token inválido o expirado
          console.error("Error de autenticación:", error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          setAuthToken(null);
          setUser(null);
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
        }
        
        return response;
      }
      
      throw new Error('No se recibió token de autenticación');
    } catch (error) {
      console.error("Error de inicio de sesión:", error);
      throw error;
    }
  };

  // Función de cierre de sesión
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_restaurant');
    localStorage.removeItem('user_data');
    setAuthToken(null);
    setUser(null);
    setCurrentRestaurant(null);
    apiClient.clearAuthToken();
  };

  // Crear valor del contexto
  const contextValue: AuthContextType = {
    user,
    authToken,
    isAuthenticated: !!authToken,
    isLoading,
    login,
    logout,
    currentRestaurant,
    setCurrentRestaurant
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