export type ImportJobStatus = 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  albumId: string;
  totalTracks: number;
  completedTracks: number;
  failedTracks: number;
  status: ImportJobStatus;
  currentTrack?: string;
  error?: string;
}

// In-memory store for import jobs. Note: this resets on server restart.
// For a production app this would ideally be in a database or Redis.
const jobs = new Map<string, ImportJob>();

export function createJob(albumId: string, totalTracks: number): string {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    id: jobId,
    albumId,
    totalTracks,
    completedTracks: 0,
    failedTracks: 0,
    status: 'processing'
  });
  return jobId;
}

export function updateJob(jobId: string, updates: Partial<ImportJob>) {
  const job = jobs.get(jobId);
  if (job) {
    jobs.set(jobId, { ...job, ...updates });
  }
}

export function getJob(jobId: string): ImportJob | undefined {
  return jobs.get(jobId);
}

export function deleteJob(jobId: string) {
  jobs.delete(jobId);
}
