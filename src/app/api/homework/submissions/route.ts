import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHomeworkSubmissions,
  createHomeworkSubmission,
} from '@/services/homeworkService';

// GET /api/homework/submissions - List homework submissions
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      assignment_id: searchParams.get('assignment_id') || undefined,
      student_id: searchParams.get('student_id') || undefined,
      status: searchParams.get('status') || undefined,
    };

    const submissions = await getHomeworkSubmissions(member.school_id, filters);
    
    return NextResponse.json({ data: submissions });
  } catch (error: any) {
    console.error('Error fetching homework submissions:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/homework/submissions - Create homework submission
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get student_id from user (for students)
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', member.school_id)
      .filter('guardians', 'cs', `{"user_id": "${user.id}"}`)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const submission = await createHomeworkSubmission(body, member.school_id, student.id);
    
    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating homework submission:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
