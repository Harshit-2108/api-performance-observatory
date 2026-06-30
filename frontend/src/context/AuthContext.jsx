import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // If client was logged in, execute silent refresh on boot
      const wasAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

      if (wasAuthenticated) {
        try {
          // Attempt token refresh
          const res = await api.post('/auth/refresh');
          if (res.data.success) {
            setAccessToken(res.data.accessToken);
            // Fetch profile
            const profileRes = await api.get('/auth/me');
            if (profileRes.data.success) {
              setUser(profileRes.data.user);
            } else {
              handleLogoutLocal();
            }
          } else {
            handleLogoutLocal();
          }
        } catch (error) {
          console.error('Silent refresh failed during startup:', error);
          handleLogoutLocal();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogoutLocal = () => {
    localStorage.removeItem('isAuthenticated');
    setAccessToken(null);
    setUser(null);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        setAccessToken(res.data.accessToken);
        localStorage.setItem('isAuthenticated', 'true');
        setUser(res.data.user);
        return { success: true };
      }
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please verify credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      if (res.data.success) {
        setAccessToken(res.data.accessToken);
        localStorage.setItem('isAuthenticated', 'true');
        setUser(res.data.user);
        return { success: true };
      }
    } catch (error) {
      console.error('Registration request failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call error:', error);
    } finally {
      handleLogoutLocal();
      setLoading(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
