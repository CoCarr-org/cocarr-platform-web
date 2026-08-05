'use client'
import React, { useEffect, useState } from 'react'
import Logo from '../../../../public/logo.png'
import InputGroup from '@/app/_components/InputGroup'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '@/store/slice/authSlice'
import { toast } from 'react-toastify'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import authAxios from '@/app/_helpers/axios'
import { PANEL } from '@/app/_helpers/panels'

// May this account use THIS panel?
//
// `/admin/me` is the cheapest question that gets a real answer: it runs the same
// per-request panel check every other endpoint does, so it cannot disagree with
// what happens a moment later.
//
// Only a `panel_denied` verdict stops the sign-in. Every other failure — no
// admins row, a 503, the network — falls through to the dashboard, where
// PanelBoot has proper states for exactly those. Turning a transient blip into
// "you cannot sign in here" would be a lie, and one the person cannot debug.
async function panelAccess() {
    try {
        await authAxios.get('/admin/me')
        return { allowed: true }
    } catch (err) {
        if (err?.response?.status === 403 && err?.response?.data?.code === 'panel_denied') {
            return { allowed: false, reason: err.response.data.error }
        }
        return { allowed: true }
    }
}

// Firebase auth errors surface as opaque codes; map the ones an admin can
// actually hit at the login screen to plain language. Anything unmapped falls
// back to a generic message rather than leaking the raw Firebase string.
function friendlyAuthError(err) {
    const code = err?.code || ''
    switch (code) {
        case 'panel/denied':
            // Already a written sentence naming the right panel — do not
            // replace it with a generic one.
            return err.message
        case 'auth/invalid-email':
            return 'Please enter a valid email address.'
        case 'auth/user-disabled':
            return 'This admin account has been disabled.'
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Incorrect email or password.'
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again in a few minutes.'
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.'
        case 'auth/invalid-api-key':
        case 'auth/configuration-not-found':
            return 'Sign-in is misconfigured. Please contact support.'
        default:
            return err?.message || 'Unable to sign in. Please try again.'
    }
}

export default function Login() {

    const [data,setData] = useState({adminEmail:'',adminPassword:''})
    const dispatch = useDispatch()
    const navigator = useRouter()
    const [loading,setLoading] = useState(false)
    const [error,setError] = useState(null)
    const authInfo = useSelector(state=>state.auth)

    useEffect(()=>
    {
        if(authInfo.token && authInfo.isLoggedIn) return navigator.replace('/dashboard')
        
    },[])
    const onSubmit = async(e)=>
    {
        e.preventDefault();
        let auth = getAuth();
        setError(null)
        setLoading(true)
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.adminEmail, data.adminPassword)
            const user = userCredential.user || auth.currentUser;
            if (user) {
                // Get the user's ID token
                const token = await user.getIdToken();

                // Is this account allowed on THIS panel? Every panel shares one
                // Firebase project, so the password was always going to be
                // correct — Firebase has no idea which site it was typed into.
                //
                // Asking here is what makes root.cocarr.com a separate login
                // rather than a separate URL. Without it an Operations admin
                // signs in successfully, lands on the dashboard, and gets a
                // blocked screen — which reads as "the panel is broken", not
                // "you are in the wrong place".
                //
                // The server still checks this on every request. This call is
                // for the person, not for the boundary.
                const verdict = await panelAccess()
                if (!verdict.allowed) {
                    await signOut(auth)
                    throw { code: 'panel/denied', message: verdict.reason }
                }

                dispatch(login({ ...user, token: token, email: user.email }))
                return navigator.replace('/dashboard')
            }
            // No user despite a resolved sign-in — treat as a failure rather
            // than silently doing nothing.
            throw { code: 'auth/no-user' }
        } catch (err) {
            setLoading(false)
            const message = friendlyAuthError(err)
            setError(message)
            toast.error(message)
        }
    }

            return (
                <div className='flex md:h-screen justify-center bg-[#f3f3f3]'>
        <div className='md:col-span-3 md:h-screen w-full'>
            <div className='h-auto md:h-full w-full flex py-8'>
                <div className="my-auto  mx-auto w-full max-w-md px-12 py-12 rounded-lg bg-white border-gray-100 border">
                    <img alt='logo' src={Logo.src} className='mx-auto w-auto h-12 mb-2'/>
                    <h1 className='text-xl font-bold text-center text-[#000]'>Hi, Welcome Back</h1>
                    <p className='text-sm text-gray-500 text-center'>to the Cocarr {PANEL.label} panel</p>
                    
                    <form className='mt-12 w-full' onSubmit={onSubmit}>
                        <InputGroup type='email' label="Email Address" placeholder="johndoe@workemail.com" value={data.adminEmail} setValue={(value)=>setData(data=>({...data,adminEmail:value}))} required={true}/>
                        <InputGroup type='password' label="Password" placeholder="8+ Characters required"  value={data.adminPassword} setValue={(value)=>setData(data=>({...data,adminPassword:value}))} required={true}/>
                        <div className='flex justify-between'>
                            {/* <Toggle/> */}
                            <Link href='/forgot-password' className='text-sm text-blue-700 font-medium'>Forgot Password</Link>
                        </div>
                        <div className='relative mt-4'>
                            <button type='submit' className='btn-xl w-full mt-4 mb-6' disabled={loading}>{loading ? 'Logging In ': 'Login'}</button>
                            {error ? <div class="w-full absolute left-0 bottom-0 flex items-center pointer-events-none overflow-hidden h-4">
                                <div className='text-center w-full'>
                            <p className='text-red-600 h-[20px] text-[14px] tracking-tight font-medium'>{error}</p>
                                    </div>
                        </div> : null}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  )
}
