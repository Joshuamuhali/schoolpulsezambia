import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTimetableEntries,
  createTimetableEntry,
} from '@/services/timetableService';

// GET /api/timetable/entries - List timetable entries
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
      class_id: searchParams.get('class_id') || undefined,
      subject_id: searchParams.get('subject_id') || undefined,
      teacher_id: searchParams.get('teacher_id') || undefined,
      academic_year_id: searchParams.get('academic_year_id') || undefined,
      term_id: searchParams.get('term_id') || undefined,
      day_of_week: searchParams.get('day_of_week') ? parseInt(searchParams.get('day_of_week')!) : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : searchParams.get('is_active') === 'false' ? false : undefined,
    };

    const entries = await getTimetableEntries(member.school_id, filters);
    
    return NextResponse.json({ data: entries });
  } catch (error: any) {
    console.error('Error fetching timetable entries:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Timetable feature' }, { status: 403 });
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

// POST /api/timetable/entries - Create timetable entry
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

    const body = await request.json();
    const entry = await createTimetableEntry(body, member.school_id, user.id);
    
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating timetable entry:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Timetable feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
