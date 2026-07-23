import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} from '@/services/timetableService';

// GET /api/timetable/entries/:id - Get single entry
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

    const entry = await getTimetableEntry(params.id, member.school_id);
    
    return NextResponse.json({ data: entry });
  } catch (error: any) {
    console.error('Error fetching timetable entry:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Timetable feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/timetable/entries/:id - Update entry
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
    const entry = await updateTimetableEntry(params.id, body, member.school_id);
    
    return NextResponse.json({ data: entry });
  } catch (error: any) {
    console.error('Error updating timetable entry:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Timetable feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/timetable/entries/:id - Delete entry
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

    await deleteTimetableEntry(params.id, member.school_id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting timetable entry:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Timetable feature' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
