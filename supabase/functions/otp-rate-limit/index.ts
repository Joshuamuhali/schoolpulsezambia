/**
 * OTP Rate Limit Edge Function
 * Server-side rate limiting for OTP requests
 * 
 * Deploy with: supabase functions deploy otp-rate-limit
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // Max 5 OTP requests per minute per IP

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit
    const now = Date.now();
    const rateLimitKey = `otp:${clientIP}`;
    const record = rateLimitStore.get(rateLimitKey);

    // Clean up expired records
    if (record && now > record.resetAt) {
      rateLimitStore.delete(rateLimitKey);
    }

    const current = rateLimitStore.get(rateLimitKey);

    if (!current) {
      // First request
      const resetAt = now + RATE_LIMIT_WINDOW;
      rateLimitStore.set(rateLimitKey, { count: 1, resetAt });
    } else if (current.count >= MAX_REQUESTS) {
      // Rate limited
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Please try again in ${retryAfter} seconds`,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    } else {
      // Increment count
      current.count++;
    }

    // Parse request body
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for disposable email domains
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return new Response(
        JSON.stringify({ error: 'Disposable email addresses are not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists and is not blocked
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email_confirmed_at')
      .eq('email', email)
      .single();

    if (existingUser && existingUser.email_confirmed_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Email already confirmed',
          message: 'This email is already registered and confirmed. Please log in instead.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via Supabase Auth
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/onboarding`,
      },
    });

    if (otpError) {
      console.error('OTP send error:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to send OTP', message: otpError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        remaining: MAX_REQUESTS - (current?.count || 0) - 1,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});