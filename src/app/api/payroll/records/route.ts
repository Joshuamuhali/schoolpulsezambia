import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPayrollRecords,
  createPayrollRecord,
} from '@/services/payrollService';

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
      staff_id: searchParams.get('staff_id') || undefined,
      status: searchParams.get('status') || undefined,
      period_start: searchParams.get('period_start') || undefined,
      period_end: searchParams.get('period_end') || undefined,
    };

    const records = await getPayrollRecords(member.school_id, filters);
    
    return NextResponse.json({ data: records });
  } catch (error: any) {
    console.error('Error fetching payroll records:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Payroll feature' }, { status: 403 });
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
    const record = await createPayrollRecord(body, member.school_id, user.id);
    
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payroll record:', error);
    
    if (error.message.includes('Feature not subscribed')) {
      return NextResponse.json({ error: 'Subscribe to Payroll feature' }, { status: 403 });
    }
    if (error.message.includes('Feature is paused')) {
      return NextResponse.json({ error: 'Feature is paused' }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
