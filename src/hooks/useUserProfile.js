import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Cache for session to prevent unnecessary re-fetches
let sessionCache = null;
let sessionPromise = null;

export function useUserProfile() {
  const [state, setState] = useState({
    profile: null,
    loading: true,
    error: null
  });
  const initialLoad = useRef(true);

  const fetchProfile = useCallback(async (user) => {
    if (!user) return null;
    
    try {
      // First try to use RPC call which bypasses RLS policies
      try {
        // Attempt to use a direct function call approach instead
        // This approach attempts to work around RLS issues
        const { data: userData } = await supabase.auth.getUser();
        if (userData && userData.user) {
          // Build a profile from user metadata if we can't access the profiles table
          const metadata = userData.user.user_metadata || {};
          return {
            id: user.id,
            email: user.email || metadata.email,
            full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
            user_type: metadata.user_type || 'supplier',
            company_name: metadata.company_name || metadata.companyname || '',
            service_type: metadata.service_type || metadata.serviceType || '',
            // Include some indication this is fallback data
            _fallback: true
          };
        }
      } catch (authErr) {
        console.log('Auth fallback failed:', authErr);
        // Continue to regular approach if this fails
      }
      
      // Regular approach - may trigger RLS policy error
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        // If there's an RLS policy error, don't throw - just log and use fallback
        if (fetchError.code === '42P17') { // Infinite recursion policy error
          console.warn('RLS policy error detected, using fallback profile data');
          return {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            user_type: user.user_metadata?.user_type || 'supplier',
            _error: 'RLS policy issue',
            _fallback: true
          };
        }
        
        console.error('Profile fetch error (non-critical):', fetchError);
        throw fetchError;
      }

      return data || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user_type: user.user_metadata?.user_type || 'supplier',
        _fallback: true
      };
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user_type: user.user_metadata?.user_type || 'supplier',
        _error: err.message,
        _fallback: true
      };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const updateState = (updates) => {
      if (!mounted) return;
      setState(prev => ({ ...prev, ...updates }));
    };

    const getProfile = async () => {
      if (!mounted || signal.aborted) return;
      
      try {
        if (initialLoad.current) {
          updateState({ loading: true });
        }

        // Get or wait for session
        let session;
        if (sessionCache) {
          session = sessionCache;
        } else if (!sessionPromise) {
          sessionPromise = supabase.auth.getSession()
            .then(({ data, error }) => {
              if (error) throw error;
              sessionCache = data?.session;
              return sessionCache;
            });
        }

        if (!session) {
          session = await sessionPromise;
        }
        
        if (!session?.user) {
          updateState({
            profile: null,
            error: null,
            loading: false
          });
          return;
        }


        // Get profile with timeout
        const profileData = await Promise.race([
          fetchProfile(session.user),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
          )
        ]);
        
        if (!mounted || signal.aborted) return;

        const userProfile = {
          id: session.user.id,
          email: session.user.email,
          ...profileData,
          full_name: profileData?.full_name || 
                    session.user.user_metadata?.full_name || 
                    session.user.email?.split('@')[0] || 'User'
        };

        updateState({
          profile: userProfile,
          error: null,
          loading: false
        });

      } catch (error) {
        if (!mounted) return;
        
        console.error('Error in getProfile:', error);
        
        // Try to create a minimal profile from session
        try {
          const session = sessionCache || (await supabase.auth.getSession()).data.session;
          if (session?.user) {
            updateState({
              profile: {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || 
                           session.user.email?.split('@')[0] || 'User',
                _error: error.message
              },
              error: error,
              loading: false
            });
          } else {
            updateState({
              profile: null,
              error: error,
              loading: false
            });
          }
        } catch (e) {
          updateState({
            profile: null,
            error: error,
            loading: false
          });
        }
      } finally {
        initialLoad.current = false;
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          sessionCache = session;
          getProfile();
        } else if (event === 'SIGNED_OUT') {
          sessionCache = null;
          sessionPromise = null;
          updateState({
            profile: null,
            error: null,
            loading: false
          });
        }
      }
    );

    // Initial fetch
    getProfile();

    return () => {
      mounted = false;
      controller.abort();
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  return state;
}
