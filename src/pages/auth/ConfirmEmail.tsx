import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Activity, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ConfirmEmail = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('') // 'sent' | 'error' | 'verified'
  const navigate = useNavigate()

  useEffect(() => {
    // Get stored email from signup if available
    const storedEmail = localStorage.getItem('pending_confirmation_email')
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  const handleResend = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')
    setStatus('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setStatus('sent')
      setMessage('✅ Confirmation email resent successfully! Please check your inbox.')
    } catch (error: any) {
      setStatus('error')
      setMessage('❌ ' + (error.message || 'Failed to resend email'))
    } finally {
      setLoading(false)
    }
  }

  const checkVerification = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email_confirmed_at) {
        setStatus('verified')
        setMessage('✅ Email verified successfully! Redirecting...')
        localStorage.removeItem('pending_confirmation_email')
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 2000)
      } else {
        setStatus('error')
        setMessage('❌ Email not verified yet. Please check your inbox and click the confirmation link.')
      }
    } catch (error: any) {
      setStatus('error')
      setMessage('❌ ' + (error.message || 'Failed to check verification status'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-success/5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-success"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                opacity: 0.15 + i * 0.08,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-6">
          <Activity className="mx-auto h-20 w-20 text-primary" />
          <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
          <p className="text-primary-foreground/70 max-w-sm">
            Multi-tenant school management — modular, transparent, and built for African schools.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Activity className="h-8 w-8 text-primary" />
              <span className="font-display text-xl font-bold text-primary">School Pulse</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-primary mb-2">Confirm Your Email</h1>
            <p className="mt-1 text-muted-foreground">
              We sent a confirmation link to your email address.
            </p>
          </div>

          {message && (
            <Alert variant={status === 'sent' || status === 'verified' ? 'default' : 'destructive'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleResend}
                disabled={loading || !email}
                className="w-full"
                variant="hero"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Confirmation Email'
                )}
              </Button>

              <Button
                onClick={checkVerification}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Verification Status'
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={handleResend}
                  className="text-primary hover:underline font-medium"
                >
                  click here to resend
                </button>
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/auth/login')}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmEmail