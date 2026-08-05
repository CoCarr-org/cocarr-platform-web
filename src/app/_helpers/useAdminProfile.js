'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import authAxios from '@/app/_helpers/axios'
import { setProfile, profileFailed } from '@/store/slice/authSlice'

// Loads `GET /admin/me` into the auth slice.
//
// Mounted once in the dashboard layout, so every page has the team, level and
// permission grid without asking for it.
//
// ── Why it refetches on every mount, not just at login ──
// The grid is persisted by redux-persist, so a session that has been open for a
// week would otherwise still be showing permissions a Super Admin changed on
// Monday. Refetching is one small request and makes a permission change take
// effect on the next page load rather than the next sign-in. `authAxios`
// already attaches the Firebase token.
export function useAdminProfile() {
  const dispatch = useDispatch()
  // `isLoggedIn` comes from redux-persist, which rehydrates SYNCHRONOUSLY from
  // localStorage — so it is true a beat before Firebase has restored the
  // session and `auth.currentUser` exists. Firing on it alone sent /admin/me
  // out with no Authorization header and got back
  // `401 Unauthorized - Missing Authorization Header` on every cold load.
  //
  // authAxios now waits for Firebase itself (see _helpers/axios.js), which is
  // the fix that protects every other call too. This second check just avoids
  // queueing a request that would only sit there waiting.
  const isLoggedIn = useSelector((s) => s.auth?.isLoggedIn)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, () => setFirebaseReady(true))
    return () => unsubscribe()
  }, [])
  // Bumped to force a refetch. The boot screen offers "Try again" on a failed
  // profile load, and without this the only way to retry would be a full page
  // reload — which also drops any unsaved state elsewhere.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isLoggedIn || !firebaseReady) return undefined

    let cancelled = false
    const load = async () => {
      try {
        const res = await authAxios.get('/admin/me')
        if (!cancelled) dispatch(setProfile(res.data))
      } catch (error) {
        if (cancelled) return
        // 403 here is meaningful, not a network blip: the backend denies
        // /admin/me when there is no `admins` row for this Firebase user. Say
        // so, because the alternative is a blank panel and no explanation.
        const message = error?.response?.status === 403
          ? (error.response.data?.error || 'Your admin account is not set up.')
          : 'Could not load your permissions. Some sections may be hidden.'
        dispatch(profileFailed(message))
      }
    }
    load()
    return () => { cancelled = true }
  }, [isLoggedIn, firebaseReady, dispatch, attempt])

  return { reload: useCallback(() => setAttempt((n) => n + 1), []) }
}
