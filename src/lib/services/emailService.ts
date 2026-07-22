/**
 * Email service for sending transactional emails
 * Integrates with Supabase Edge Functions for email delivery
 */

export interface EmailConfirmationData {
  to: string;
  token: string;
  userName?: string;
}

export interface PasswordResetData {
  to: string;
  resetUrl: string;
  userName?: string;
}

export interface TeacherInvitationData {
  to: string;
  teacherName: string;
  schoolName: string;
  specialization?: string;
  employmentType: string;
  token: string;
  invitedBy: string;
}

export interface ParentInvitationData {
  to: string;
  parentName: string;
  schoolName: string;
  studentName: string;
  relationship: string;
  token: string;
  invitedBy: string;
}

/**
 * Request email confirmation for a user
 */
export async function sendEmailConfirmation(email: string, token: string): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    // Use Supabase's built-in email confirmation
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      // If user already confirmed, this is not an error
      if (error.message.includes('already confirmed')) {
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't throw - allow login to proceed, user can resend later
  }
}

/**
 * Check if user's email is confirmed
 */
export async function isEmailConfirmed(userId: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !data.user) {
      return false;
    }

    return !!data.user.email_confirmed_at;
  } catch (error) {
    console.error('Failed to check email confirmation:', error);
    return false;
  }
}

/**
 * Resend confirmation email with cooldown
 */
export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    // Check cooldown (60 seconds)
    const cooldownKey = `confirm_cooldown:${email}`;
    const lastSent = localStorage.getItem(cooldownKey);
    
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent, 10);
      const remaining = 60000 - elapsed; // 60 seconds
      
      if (remaining > 0) {
        return {
          success: false,
          message: `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting again.`
        };
      }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      if (error.message.includes('already confirmed')) {
        return {
          success: false,
          message: 'Email is already confirmed. You can log in.'
        };
      }
      throw error;
    }

    // Set cooldown
    localStorage.setItem(cooldownKey, Date.now().toString());

    return {
      success: true,
      message: 'Confirmation email sent! Please check your inbox.'
    };
  } catch (error) {
    console.error('Failed to resend confirmation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email. Please try again.'
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, redirectTo?: string): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to send password reset:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if domain is disposable (basic check)
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    'tempmail.com',
    'guerrillamail.com',
    'mailinator.com',
    '10minutemail.com',
    'throwaway.email',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

/**
 * Send teacher invitation email
 */
export async function sendTeacherInvitationEmail(data: TeacherInvitationData): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    // Call Supabase Edge Function to send email
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'teacher_invitation',
        to: data.to,
        data: {
          teacherName: data.teacherName,
          schoolName: data.schoolName,
          specialization: data.specialization,
          employmentType: data.employmentType,
          registrationUrl: `${window.location.origin}/staff/register?token=${data.token}`,
          invitedBy: data.invitedBy,
        },
      },
    });

    if (error) {
      console.error('Failed to send teacher invitation email:', error);
      // For development, log the registration URL
      console.log('Teacher Registration URL:', `${window.location.origin}/staff/register?token=${data.token}`);
    }
  } catch (error) {
    console.error('Failed to send teacher invitation email:', error);
    // Don't throw - allow invitation to be created, email can be resent later
  }
}

/**
 * Send parent invitation email
 */
export async function sendParentInvitationEmail(data: ParentInvitationData): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    
    // Call Supabase Edge Function to send email
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'parent_invitation',
        to: data.to,
        data: {
          parentName: data.parentName,
          schoolName: data.schoolName,
          studentName: data.studentName,
          relationship: data.relationship,
          registrationUrl: `${window.location.origin}/parent/register?token=${data.token}`,
          invitedBy: data.invitedBy,
        },
      },
    });

    if (error) {
      console.error('Failed to send parent invitation email:', error);
      // For development, log the registration URL
      console.log('Parent Registration URL:', `${window.location.origin}/parent/register?token=${data.token}`);
    }
  } catch (error) {
    console.error('Failed to send parent invitation email:', error);
    // Don't throw - allow invitation to be created, email can be resent later
  }
}