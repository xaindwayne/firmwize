import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'platform_admin' | 'client_admin' | 'employee';

interface UseUserRoleReturn {
  role: AppRole | null;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  isClientAdmin: boolean;
  isEmployee: boolean;
  hasAdminAccess: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    isLoading,
    isPlatformAdmin: role === 'platform_admin',
    isClientAdmin: role === 'client_admin',
    isEmployee: role === 'employee',
    hasAdminAccess: role === 'platform_admin' || role === 'client_admin',
  };
}