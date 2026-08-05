'use client'
import React, { useEffect, useState } from 'react'
import Logo from '../../../../public/logo.png'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'

// Maps the Firebase reset-code errors this page can hit to plain language.
function friendlyResetError(err) {
    switch (err?.code || '') {
        case 'auth/expired-action-code':
            return 'This link has expired. Please request a new one.'
        case 'auth/invalid-action-code':
            return 'This link is invalid or has already been used. Please request a new one.'
        case 'auth/user-disabled':
            return 'This admin account has been disabled.'
        case 'auth/user-not-found':
            return 'No admin account is associated with this link.'
        case 'auth/weak-password':
            return 'Please choose a stronger password (at least 6 characters).'
        default:
            return err?.message || 'Something went wrong. Please try again.'
    }
}

export default function SetPassword() {
    const navigator = useRouter()
    const [oobCode, setOobCode] = useState(null)
    const [email, setEmail] = useState(null)
    const [verifying, setVerifying] = useState(true)
    const [codeError, setCodeError] = useState(null)

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    // Read the oobCode from the query string (?oobCode=...) and verify it with
    // Firebase up front, so an expired/invalid link is caught before the admin
    // fills anything in. Reading window.location.search directly avoids the
    // Suspense boundary Next requires around useSearchParams.
    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('oobCode')
        if (!code) {
            setCodeError('This link is invalid or has expired. Please request a new one.')
            setVerifying(false)
            return
        }
        setOobCode(code)
        verifyPasswordResetCode(getAuth(), code)
            .then((mail) => { setEmail(mail); setVerifying(false) })
            .catch((err) => { setCodeError(friendlyResetError(err)); setVerifying(false) })
    }, [])

    const onSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        if (password.length < 6) return setError('Password must be at least 6 characters.')
        if (password !== confirm) return setError('Passwords do not match.')

        setLoading(true)
        try {
            await confirmPasswordReset(getAuth(), oobCode, password)
            toast.success('Password updated. Please sign in.')
            navigator.replace('/login')
        } catch (err) {
            setLoading(false)
            const message = friendlyResetError(err)
            setError(message)
            toast.error(message)
        }
    }

    return (
        <div className='flex md:h-screen justify-center bg-[#f3f3f3]'>
            <div className='md:col-span-3 md:h-screen w-full'>
                <div className='h-auto md:h-full w-full flex py-8'>
                    <div className="my-auto mx-auto w-full max-w-md px-12 py-12 rounded-lg bg-white border-gray-100 border">
                        <img alt='logo' src={Logo.src} className='mx-auto w-auto h-12 mb-2' />

                        {verifying ? (
                            <p className='text-center text-sm text-gray-500 mt-6'>Verifying your link…</p>
                        ) : codeError ? (
                            <>
                                <h1 className='text-xl font-bold text-center text-[#000]'>Link problem</h1>
                                <p className='text-sm text-red-600 text-center mt-4'>{codeError}</p>
                                <div className='mt-8 text-center'>
                                    <Link href='/forgot-password' className='text-sm text-blue-700 font-medium'>Request a new link</Link>
                                </div>
                                <div className='mt-3 text-center'>
                                    <Link href='/login' className='text-sm text-gray-500'>Back to login</Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h1 className='text-xl font-bold text-center text-[#000]'>Set your password</h1>
                                <p className='text-sm text-gray-500 text-center'>{email ? `for ${email}` : 'for your admin account'}</p>

                                <form className='mt-10 w-full' onSubmit={onSubmit}>
                                    <div className='mt-4 mb-4'>
                                        <label className='text-[#000] text-sm font-medium'>New Password</label>
                                        <input
                                            type='password'
                                            minLength={6}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder='8+ Characters required'
                                            className='mt-1 border border-gray-300 text-gray-900 text-sm rounded-md focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 block w-full p-4'
                                        />
                                    </div>
                                    <div className='mt-4 mb-4'>
                                        <label className='text-[#000] text-sm font-medium'>Confirm Password</label>
                                        <input
                                            type='password'
                                            minLength={6}
                                            required
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            placeholder='Re-enter your password'
                                            className='mt-1 border border-gray-300 text-gray-900 text-sm rounded-md focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 block w-full p-4'
                                        />
                                    </div>

                                    {error ? <p className='text-red-600 text-[14px] tracking-tight font-medium mt-1'>{error}</p> : null}

                                    <button type='submit' className='btn-xl w-full mt-6 mb-4' disabled={loading}>
                                        {loading ? 'Saving…' : 'Set Password'}
                                    </button>
                                    <div className='text-center'>
                                        <Link href='/login' className='text-sm text-gray-500'>Back to login</Link>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
