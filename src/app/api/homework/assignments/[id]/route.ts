import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHomeworkAssignment,
  updateHomeworkAssignment,
  deleteHomeworkAssignment,
  publishHomeworkAssignment,
} from '@/services/homeworkService';

// GET /api/homework/assignments/:id - Get single assignment
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const assignment = await getHomeworkAssignment(params.id, member.school_id);
    
    return NextResponse.json({ data: assignment });
  } catch (error: any) {
    console.error('Error fetching homework assignment:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/homework/assignments/:id - Update assignment
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const assignment = await updateHomeworkAssignment(params.id, body, member.school_id);
    
    return NextResponse.json({ data: assignment });
  } catch (error: any) {
    console.error('Error updating homework assignment:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/homework/assignments/:id - Delete assignment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    await deleteHomeworkAssignment(params.id, member.school_id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting homework assignment:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/homework/assignments/:id/publish - Publish assignment
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const assignment = await publishHomeworkAssignment(params.id, member.school_id);
    
    return NextResponse.json({ data: assignment });
  } catch (error: any) {
    console.error('Error publishing homework assignment:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Homework feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
