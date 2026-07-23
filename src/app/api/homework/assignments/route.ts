import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHomeworkAssignments,
  createHomeworkAssignment,
} from '@/services/homeworkService';

// GET /api/homework/assignments - List homework assignments
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school_id from user
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
      class_id: searchParams.get('class_id') || undefined,
      subject_id: searchParams.get('subject_id') || undefined,
      status: searchParams.get('status') || undefined,
      academic_year_id: searchParams.get('academic_year_id') || undefined,
      term_id: searchParams.get('term_id') || undefined,
    };

    const assignments = await getHomeworkAssignments(member.school_id, filters);
    
    return NextResponse.json({ data: assignments });
  } catch (error: any) {
    console.error('Error fetching homework assignments:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    if (error.message.includes('Feature is expired')) {
      return NextResponse.json({ error: 'Feature is expired' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/homework/assignments - Create homework assignment
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school_id from user
    const { data: member } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const body = await request.json();
    const assignment = await createHomeworkAssignment(body, member.school_id, user.id);
    
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating homework assignment:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
