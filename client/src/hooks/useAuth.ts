import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useLocation } from "wouter";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  token: string;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: Boolean(token), // Only make the request if we have a token
  });

  const isAuthenticated = Boolean(user?.token || token);

  const logout = useCallback(async () => {
    try {
      // Make the logout request
      await fetch('/api/logout', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear the token and user data
      localStorage.removeItem('token');
      // Clear React Query cache
      queryClient.clear();
      // Use setLocation for proper routing
      setLocation('/');
    }
  }, [setLocation, queryClient, token]);

  console.log('Auth State:', { 
    user, 
    isLoading, 
    error, 
    isAuthenticated,
    hasUserToken: Boolean(user?.token),
    hasLocalToken: Boolean(token)
  });

  return {
    user,
    isLoading,
    isAuthenticated,
    logout
  };
}