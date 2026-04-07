import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; role: string } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [user, setUser] = useState<{ name: string; role: string } | null>(() => {
    const storedUser = localStorage.getItem('auth_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [sessionTimeout, setSessionTimeout] = useState<number>(60); // minutes

  // Load timeout from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/config/settings`);
        if (response.ok) {
          const data = await response.json();
          if (data.security?.sessionTimeout) {
            setSessionTimeout(data.security.sessionTimeout);
          }
        }
      } catch (error) {
        console.error("AuthContext: Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('is_authenticated', 'true');
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('last_activity', Date.now().toString());
        return true;
      }
      
      // Fallback rescue code for demonstrations (in case DB not seeded)
      if (username === 'admin' && password === 'Labs2017$') {
         setIsAuthenticated(true);
         const userData = { name: 'Administrateur', role: 'admin' };
         setUser(userData);
         localStorage.setItem('is_authenticated', 'true');
         localStorage.setItem('auth_user', JSON.stringify(userData));
         localStorage.setItem('last_activity', Date.now().toString());
         return true;
      }

      return false;
    } catch (error) {
      console.error("Login Error:", error);
      // Fallback emergency mode
      if (username === 'admin' && password === 'Labs2017$') {
         setIsAuthenticated(true);
         setUser({ name: 'Administrateur', role: 'admin' });
         localStorage.setItem('is_authenticated', 'true');
         return true;
      }
      return false;
    }
  };

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_activity');
  }, []);

  // Session Timeout Logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity) {
        const diffInMs = Date.now() - parseInt(lastActivity);
        const diffInMinutes = diffInMs / (1000 * 60);
        
        if (diffInMinutes >= sessionTimeout) {
          console.log("Session expired due to inactivity");
          logout();
        }
      }
    };

    const resetTimer = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    const interval = setInterval(checkTimeout, 30000); // Check every 30s
    
    // Listen for user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isAuthenticated, sessionTimeout, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
