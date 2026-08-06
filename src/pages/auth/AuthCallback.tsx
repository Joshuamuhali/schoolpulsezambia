import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

const AuthCallback = () => {
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from URL
        const hashFragment = window.location.hash
        const params = new URLSearchParams(hashFragment.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        console.log('Auth callback params:', { type, hasToken: !!accessToken })

        if (type === 'signup' || type === 'email' || type === 'magiclink') {
          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (error) throw error

            // Check if email is confirmed
            const { data: { user } } = await supabase.auth.getUser()
            const isConfirmed = user?.email_confirmed_at !== null

            if (isConfirmed) {
              setStatus('success')
              setMessage('✅ Email confirmed successfully! Redirecting...')
              
              // Redirect to onboarding welcome page
              setTimeout(() => {
                navigate('/onboarding/welcome', { replace: true })
              }, 2000)
            } else {
              setStatus('pending')
              setMessage('⚠️ Email confirmation pending. Please try again.')
            }
          } else {
            setStatus('error')
            setMessage('❌ Invalid confirmation link. Please try again.')
            setTimeout(() => {
              navigate('/auth/login', { replace: true })
            }, 3000)
          }
        } else if (type === 'recovery') {
          // Password recovery flow
          setStatus('success')
          setMessage('✅ You can now reset your password. Redirecting...')
          setTimeout(() => {
            navigate('/auth/reset-password', { replace: true })
          }, 2000)
        } else {
          setStatus('error')
          setMessage('❌ Invalid callback parameters')
          setTimeout(() => {
            navigate('/auth/login', { replace: true })
          }, 3000)
        }
      } catch (error: any) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('❌ ' + (error.message || 'Verification failed'))
        setTimeout(() => {
          navigate('/auth/login', { replace: true })
        }, 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Email Confirmation</h2>
        
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-green-500 text-5xl">✅</div>
            <p className="text-gray-800 font-medium">{message}</p>
            <div className="animate-pulse text-sm text-gray-500">Please wait...</div>
          </div>
        )}
        
        {status === 'pending' && (
          <div className="space-y-4">
            <div className="text-yellow-500 text-5xl">⚠️</div>
            <p className="text-gray-800">{message}</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-red-500 text-5xl">❌</div>
            <p className="text-gray-800">{message}</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback