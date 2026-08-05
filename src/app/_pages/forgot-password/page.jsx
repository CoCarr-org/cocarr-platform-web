'use client'
import React, { useState } from 'react'
import Logo from '../../../../public/logo.png'
import Link from 'next/link'
import { toast } from 'react-toastify'
import authAxios from '@/app/_helpers/axios'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    const onSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            // Backend generates a one-time link to /set-password and emails it
            // (SendGrid). It always responds success for a well-formed request
            // (it won't reveal whether the email is an admin), so a 2xx just
            // means "sent if it exists".
            await authAxios.post('/admin/forgot-password', { email: email.trim().toLowerCase() })
            setSent(true)
        } catch (err) {
            setLoading(false)
            const message = err?.response?.data?.error || 'Could not send the reset email. Please try again.'
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

                        {sent ? (
                            <>
                                <h1 className='text-xl font-bold text-center text-[#000]'>Check your email</h1>
                                <p className='text-sm text-gray-500 text-center mt-4'>
                                    If an admin account exists for <span className='font-medium'>{email}</span>, we've sent a link to set a new password. The link can be used once and will expire.
                                </p>
                                <div className='mt-8 text-center'>
                                    <Link href='/login' className='text-sm text-blue-700 font-medium'>Back to login</Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h1 className='text-xl font-bold text-center text-[#000]'>Forgot password</h1>
                                <p className='text-sm text-gray-500 text-center'>Enter your admin email and we'll send you a reset link</p>

                                <form className='mt-10 w-full' onSubmit={onSubmit}>
                                    <div className='mt-4 mb-4'>
                                        <label className='text-[#000] text-sm font-medium'>Email Address</label>
                                        <input
                                            type='email'
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder='johndoe@workemail.com'
                                            className='mt-1 border border-gray-300 text-gray-900 text-sm rounded-md focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 block w-full p-4'
                                        />
                                    </div>

                                    {error ? <p className='text-red-600 text-[14px] tracking-tight font-medium mt-1'>{error}</p> : null}

                                    <button type='submit' className='btn-xl w-full mt-6 mb-4' disabled={loading}>
                                        {loading ? 'Sending…' : 'Send Reset Link'}
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
