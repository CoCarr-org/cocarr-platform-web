import { createSlice } from "@reduxjs/toolkit";

// The signed-in admin: their session, and what they may do.
//
// Everything from `team` down is filled by `GET /admin/me` after sign-in, not by
// the Firebase credential — Firebase knows who you are, the backend knows what
// you may do. Before this existed the panel knew neither, so it rendered every
// menu item for everybody and people discovered their access by collecting 403s.
//
// NOTE: `role` is the LEGACY role integer, kept for display only. Nothing should
// branch on it. It used to silently outrank the team system on the backend,
// which is what happens when two competing notions of "who is this" both look
// authoritative.
const initialState = {
    isLoggedIn: false,
    token: null,
    userName: null,
    email: null,
    role: null,

    // ── From /admin/me ──
    team: null,          // {id, key, name}
    level: null,         // {id, key, name, rank}
    permissions: null,   // {module: {create, read, update, delete}} — null until loaded
    // Per-SCREEN overrides, keyed by nav route. Only screens that deviate from
    // their module are present; absent means "inherits the module".
    submodules: {},
    // How the backend arrived at that grid: bootstrap | team | legacy | none.
    // The shell warns a `legacy` admin that they are not on a team yet.
    source: null,
    // false when the server is in RBAC dry-run and allows everything. The panel
    // mirrors it rather than gating anyway — see _helpers/permissions.js.
    enforced: true,
    // Distinguishes "not fetched yet" from "fetched, and they have nothing".
    // Those render very differently: a skeleton versus an honest empty state.
    profileLoaded: false,
    profileError: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => ({
            ...state,
            isLoggedIn: true,
            token: action.payload.token,
            userName: action.payload.userName ?? action.payload.displayName ?? null,
            email: action.payload.email ?? null,
            role: action.payload.role ?? null,
        }),

        // The /admin/me response. Replaces the permission grid wholesale rather
        // than merging: a merge would let a permission REMOVED by a Super Admin
        // linger in a long-lived session.
        setProfile: (state, action) => ({
            ...state,
            userName: action.payload.name ?? state.userName,
            email: action.payload.email ?? state.email,
            role: action.payload.legacyRole ?? state.role,
            team: action.payload.team ?? null,
            level: action.payload.level ?? null,
            permissions: action.payload.permissions ?? null,
            submodules: action.payload.submodules ?? {},
            source: action.payload.source ?? null,
            enforced: action.payload.enforced !== false,
            profileLoaded: true,
            profileError: null,
        }),

        profileFailed: (state, action) => ({
            ...state,
            // Deliberately does NOT clear an existing grid. A transient failure
            // refreshing the profile must not strip a working session down to an
            // empty sidebar — the previous answer is better than none.
            profileLoaded: true,
            profileError: action.payload ?? 'Could not load your profile',
        }),

        logout: () => ({ ...initialState }),

        updateToken: (state, action) => ({ ...state, token: action.payload }),
    }
})

export const { login, logout, updateToken, setProfile, profileFailed } = authSlice.actions

export default authSlice.reducer
