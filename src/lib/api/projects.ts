import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  client_id?: string
  contract_id?: string
  start_date?: string
  end_date?: string
  manager_id?: string
  status?: string
  progress_percentage?: number
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreateProjectPayload {
  name: string
  description?: string
  client_id?: string
  contract_id?: string
  start_date?: string
  end_date?: string
  manager_id?: string
}

export interface ProjectStatus {
  status?: string
  progress_percentage?: number
  [key: string]: unknown
}

export interface ProjectTeamMember {
  id?: string
  user_id: string
  role?: string
  [key: string]: unknown
}

export interface ProjectActivity {
  id?: string
  name: string
  description?: string
  planned_start?: string
  planned_end?: string
  actual_start?: string
  actual_end?: string
  parent_activity_id?: string
  status?: string
  tenant_slug?: string
  [key: string]: unknown
}

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface CreateActivityPayload {
  name: string
  description?: string
  planned_start?: string
  planned_end?: string
  parent_activity_id?: string
}

export interface DailyReport {
  id?: string
  report_date: string
  submitted_by: string
  weather?: string
  work_done?: string
  issues?: string
  progress_percentage?: number
  [key: string]: unknown
}

export interface CreateDailyReportPayload {
  report_date: string
  submitted_by: string
  weather?: string
  work_done?: string
  issues?: string
  progress_percentage?: number
}

export interface ProjectMilestone {
  id?: string
  name: string
  description?: string
  due_date?: string
  reached_at?: string
  [key: string]: unknown
}

export interface CreateMilestonePayload {
  name: string
  description?: string
  due_date?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    if (res?.data?.message) return res.data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(page = 1): Promise<PaginatedResponse<Project>> {
  const res = await apiClient.get<PaginatedResponse<Project>>('/v1/projects', {
    params: { page },
  })
  return res.data
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const res = await apiClient.post<Project | { data: Project }>('/v1/projects', payload)
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Project }).data
    : (res.data as Project)
}

export async function getProject(id: string): Promise<Project> {
  const res = await apiClient.get<Project | { data: Project }>(`/v1/projects/${id}`)
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Project }).data
    : (res.data as Project)
}

export async function getProjectStatus(id: string): Promise<ProjectStatus> {
  const res = await apiClient.get<ProjectStatus | { data: ProjectStatus }>(
    `/v1/projects/${id}/status`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectStatus }).data
    : (res.data as ProjectStatus)
}

export async function getProjectTeam(id: string): Promise<ProjectTeamMember[]> {
  const res = await apiClient.get<ProjectTeamMember[] | { data: ProjectTeamMember[] }>(
    `/v1/projects/${id}/team`
  )
  return Array.isArray(res.data) ? res.data : res.data.data
}

export async function canCloseProject(
  id: string
): Promise<{ can_close: boolean; [key: string]: unknown }> {
  const res = await apiClient.get<{ can_close: boolean; [key: string]: unknown }>(
    `/v1/projects/${id}/can-close`
  )
  return res.data
}

export async function activateProject(id: string): Promise<Project> {
  const res = await apiClient.patch<Project | { data: Project }>(
    `/v1/projects/${id}/activate`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Project }).data
    : (res.data as Project)
}

export async function closeProject(id: string): Promise<Project> {
  const res = await apiClient.patch<Project | { data: Project }>(
    `/v1/projects/${id}/close`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Project }).data
    : (res.data as Project)
}

export async function updateProgress(
  id: string,
  progress_percentage: number
): Promise<Project> {
  const res = await apiClient.patch<Project | { data: Project }>(
    `/v1/projects/${id}/progress`,
    { progress_percentage }
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Project }).data
    : (res.data as Project)
}

export async function addActivity(
  projectId: string,
  payload: CreateActivityPayload
): Promise<ProjectActivity> {
  const res = await apiClient.post<ProjectActivity | { data: ProjectActivity }>(
    `/v1/projects/${projectId}/activities`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectActivity }).data
    : (res.data as ProjectActivity)
}

export async function submitDailyReport(
  projectId: string,
  payload: CreateDailyReportPayload
): Promise<DailyReport> {
  const res = await apiClient.post<DailyReport | { data: DailyReport }>(
    `/v1/projects/${projectId}/daily-reports`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: DailyReport }).data
    : (res.data as DailyReport)
}

export async function addMilestone(
  projectId: string,
  payload: CreateMilestonePayload
): Promise<ProjectMilestone> {
  const res = await apiClient.post<ProjectMilestone | { data: ProjectMilestone }>(
    `/v1/projects/${projectId}/milestones`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectMilestone }).data
    : (res.data as ProjectMilestone)
}

export async function markMilestoneReached(milestoneId: string): Promise<ProjectMilestone> {
  const res = await apiClient.patch<ProjectMilestone | { data: ProjectMilestone }>(
    `/v1/projects/milestones/${milestoneId}/reached`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectMilestone }).data
    : (res.data as ProjectMilestone)
}

export async function assignTeamMember(
  projectId: string,
  user_id: string,
  role?: string
): Promise<ProjectTeamMember> {
  const res = await apiClient.post<ProjectTeamMember | { data: ProjectTeamMember }>(
    `/v1/projects/${projectId}/team`,
    { user_id, ...(role ? { role } : {}) }
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectTeamMember }).data
    : (res.data as ProjectTeamMember)
}

// ─── Activity Status Update — API-GAP-M2-01 ──────────────────────────────────
// PATCH /api/v1/projects/activities/{activityId}/status
// Body: { status: ActivityStatus }
// Valid transitions:
//   pending     → in_progress | cancelled
//   in_progress → completed   | cancelled
//   completed   → (terminal)
//   cancelled   → (terminal)

export async function updateActivityStatus(
  activityId: string,
  status: ActivityStatus
): Promise<ProjectActivity> {
  const res = await apiClient.patch<ProjectActivity | { data: ProjectActivity }>(
    `/v1/projects/activities/${activityId}/status`,
    { status }
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ProjectActivity }).data
    : (res.data as ProjectActivity)
}
