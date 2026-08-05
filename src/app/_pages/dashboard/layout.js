'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getAuth, onIdTokenChanged, signOut } from 'firebase/auth';
import axios from 'axios';

import AppSidebar from '@/app/_components/Sidebar';
import { updateToken, logout } from '@/store/slice/authSlice';
import { useAdminProfile } from '@/app/_helpers/useAdminProfile';
import PanelBoot from '@/app/_components/PanelBoot';
import Loader from '@/app/_components/Loader';
import { SidebarInset } from '@/components/ui/sidebar';
import Sidebar from '@/app/_components/Sidebar';

const DashboardLayout = ({ children }) => {
  const authInfo = useSelector(state => state.auth);
  const dispatch = useDispatch();
  // Loads GET /admin/me into the auth slice: team, level and the permission
  // grid the sidebar and every `can()` call read. Refetches on mount, so a
  // permission change takes effect on the next page load rather than the next
  // sign-in — the grid is persisted, and a week-old session would otherwise
  // still be showing Monday's permissions.
  const { reload: reloadProfile } = useAdminProfile();
  const router = useRouter();
  const auth = getAuth();
  const initialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set base URL and token on mount
  useEffect(() => {
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseURL) {
      console.error('Base URL is not defined in .env');
    } else {
      axios.defaults.baseURL = baseURL;
    }

    const initialize = async () => {
      const user = auth.currentUser;

      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const expirationTime = new Date(tokenResult.expirationTime).getTime();
          const currentTime = new Date().getTime();

          if (currentTime >= expirationTime) {
            // Token is expired, get a new one
            const newToken = await user.getIdToken(true);
            dispatch(updateToken(newToken));
            axios.defaults.headers.common['Authorization'] = `${newToken}`;
          } else {
            dispatch(updateToken(tokenResult.token));
            axios.defaults.headers.common['Authorization'] = `${tokenResult.token}`;
          }
        } catch (err) {
          console.error('Error checking token expiration:', err);
          dispatch(logout());
          router.replace('/login');
        }
      }
      setIsInitialized(true);
    };

    initialize();
  }, [dispatch, auth, router]);

  // Listen for token changes and attach to axios
  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    const unsubscribe = onIdTokenChanged(auth, async user => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const expirationTime = new Date(tokenResult.expirationTime).getTime();
          const currentTime = new Date().getTime();

          if (currentTime >= expirationTime) {
            // Token is expired, get a new one
            const newToken = await user.getIdToken(true);
            dispatch(updateToken(newToken));
            axios.defaults.headers.common['Authorization'] = `${newToken}`;
          } else {
            dispatch(updateToken(tokenResult.token));
            axios.defaults.headers.common['Authorization'] = `${tokenResult.token}`;
          }
        } catch (err) {
          console.error('Error fetching token:', err);
          dispatch(logout());
          router.replace('/login');
        }
      } else {
        // Clear token when user is null
        dispatch(logout());
        delete axios.defaults.headers.common['Authorization'];
      }
    });

    return () => unsubscribe();
  }, [auth, dispatch, router]);

  // Update axios headers when token changes in Redux store
  useEffect(() => {
    if (authInfo.token) {
      axios.defaults.headers.common['Authorization'] = `${authInfo.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [authInfo.token]);

  // Axios interceptor for keeping token fresh in every request
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async config => {
        const user = auth.currentUser;

        if (user) {
          try {
            const tokenResult = await user.getIdTokenResult();
            const expirationTime = new Date(tokenResult.expirationTime).getTime();
            const currentTime = new Date().getTime();

            if (currentTime >= expirationTime) {
              // Token is expired, get a new one
              const newToken = await user.getIdToken(true);
              config.headers.Authorization = `${newToken}`;
              dispatch(updateToken(newToken));
            } else {
              config.headers.Authorization = `${tokenResult.token}`;
            }
          } catch (err) {
            console.error('Interceptor token fetch error:', err);
            dispatch(logout());
            router.replace('/login');
          }
        }

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.request.eject(interceptor);
  }, [auth, dispatch, router]);

  // ── Two gates, in order ──
  // 1. Firebase has settled (are you signed in at all?)
  // 2. GET /admin/me has answered (what may you see?)
  //
  // The second is not optional. The sidebar, the router gate and every `can()`
  // read the permission grid, and until it lands the grid is null — which the
  // helpers correctly treat as "nothing". Rendering the panel before then shows
  // a signed-in admin an empty sidebar and a No Access page for a beat, then
  // snaps to the real thing. That reads as "my access was just revoked".
  if (!isInitialized) {
    return <PanelBoot state='loading' message='Signing you in…' />;
  }

  if (authInfo.isLoggedIn && !authInfo.profileLoaded) {
    return <PanelBoot state='loading' message='Checking your access…' />;
  }

  // The profile call failed. `blocked` is the backend refusing because there is
  // no `admins` row for this Firebase user — a real answer, not a network
  // problem, so it offers sign-out rather than a retry that cannot help.
  if (authInfo.isLoggedIn && authInfo.profileError && !authInfo.permissions) {
    const blocked = /not set up/i.test(authInfo.profileError);
    return (
      <PanelBoot
        state={blocked ? 'blocked' : 'error'}
        message={authInfo.profileError}
        onRetry={reloadProfile}
        onSignOut={() => dispatch(logout())}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-[#F5F5F5] overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
