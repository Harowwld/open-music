import { NextResponse } from 'next/server';
import { getJob, deleteJob } from '@/lib/importJobs';

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  deleteJob(jobId);
  return NextResponse.json({ success: true });
}
