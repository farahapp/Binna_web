import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  employment_type?: 'full_time' | 'part_time' | 'contractor' | 'intern' | string
  job_title?: string
  department?: string
  hire_date?: string
  status?: string
  user_id?: string
  daily_rate?: string | number
  hourly_rate?: string | number
  currency?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface PaginatedEmployees {
  data: Employee[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export interface ProjectAssignment {
  id: string
  employee_id: string
  project_id: string
  role?: string
  start_date?: string
  end_date?: string
  allocation_percentage?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  hours_worked?: number
  status?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_requested?: number
  reason?: string
  status?: string
  approved_by?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface CostAllocation {
  id: string
  employee_id: string
  project_id?: string
  cost_code?: string
  amount: string | number
  allocation_date?: string
  period?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function extractMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data
  ) {
    return String((error.response.data as { message: string }).message)
  }
  if (error instanceof Error) return error.message
  return 'حدث خطأ غير متوقع'
}

// ─── Employee API ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/hr/employees
 */
export async function registerEmployee(
  data: Omit<Employee, 'id' | 'status' | 'created_at' | 'updated_at' | 'tenant_slug'>
): Promise<Employee> {
  const res = await apiClient.post<Employee>('/v1/hr/employees', data)
  return res.data
}

/**
 * GET /api/v1/hr/employees/{id}
 */
export async function getEmployee(id: string): Promise<Employee> {
  const res = await apiClient.get<Employee>(`/v1/hr/employees/${id}`)
  return res.data
}

/**
 * GET /api/v1/hr/employees
 */
export async function listEmployees(page = 1): Promise<PaginatedEmployees> {
  const res = await apiClient.get<PaginatedEmployees | Employee[]>('/v1/hr/employees', {
    params: { page },
  })
  if (Array.isArray(res.data)) return { data: res.data }
  return res.data as PaginatedEmployees
}

/**
 * PATCH /api/v1/hr/employees/{id}/terminate
 */
export async function terminateEmployee(
  id: string,
  data: { termination_date?: string; reason?: string }
): Promise<Employee> {
  const res = await apiClient.patch<Employee>(`/v1/hr/employees/${id}/terminate`, data)
  return res.data
}

// ─── Project Assignment API ───────────────────────────────────────────────────

/**
 * POST /api/v1/hr/employees/{id}/project-assignments
 */
export async function assignEmployeeToProject(
  employeeId: string,
  data: {
    project_id: string
    role?: string
    start_date?: string
    end_date?: string
    allocation_percentage?: number
    notes?: string
  }
): Promise<ProjectAssignment> {
  const res = await apiClient.post<ProjectAssignment>(
    `/v1/hr/employees/${employeeId}/project-assignments`,
    data
  )
  return res.data
}

// ─── Attendance API ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/hr/employees/{id}/attendance
 */
export async function recordAttendance(
  employeeId: string,
  data: {
    date: string
    check_in?: string
    check_out?: string
    hours_worked?: number
    status?: string
    notes?: string
  }
): Promise<AttendanceRecord> {
  const res = await apiClient.post<AttendanceRecord>(
    `/v1/hr/employees/${employeeId}/attendance`,
    data
  )
  return res.data
}

/**
 * GET /api/v1/hr/employees/{id}/attendance
 */
export async function getEmployeeAttendance(employeeId: string): Promise<AttendanceRecord[]> {
  const res = await apiClient.get<AttendanceRecord[] | { data: AttendanceRecord[] }>(
    `/v1/hr/employees/${employeeId}/attendance`
  )
  if (Array.isArray(res.data)) return res.data
  if (res.data && 'data' in res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

// ─── Leave API ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/hr/employees/{id}/leave-requests
 */
export async function createLeaveRequest(
  employeeId: string,
  data: {
    leave_type: string
    start_date: string
    end_date: string
    reason?: string
    notes?: string
  }
): Promise<LeaveRequest> {
  const res = await apiClient.post<LeaveRequest>(
    `/v1/hr/employees/${employeeId}/leave-requests`,
    data
  )
  return res.data
}

/**
 * GET /api/v1/hr/employees/{id}/leave-requests
 */
export async function getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const res = await apiClient.get<LeaveRequest[] | { data: LeaveRequest[] }>(
    `/v1/hr/employees/${employeeId}/leave-requests`
  )
  if (Array.isArray(res.data)) return res.data
  if (res.data && 'data' in res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

/**
 * PATCH /api/v1/hr/leave-requests/{id}/approve
 */
export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const res = await apiClient.patch<LeaveRequest>(`/v1/hr/leave-requests/${id}/approve`)
  return res.data
}

/**
 * PATCH /api/v1/hr/leave-requests/{id}/reject
 */
export async function rejectLeaveRequest(
  id: string,
  data?: { reason?: string }
): Promise<LeaveRequest> {
  const res = await apiClient.patch<LeaveRequest>(`/v1/hr/leave-requests/${id}/reject`, data)
  return res.data
}

// ─── Cost Allocation API ──────────────────────────────────────────────────────

/**
 * POST /api/v1/hr/employees/{id}/cost-allocations
 */
export async function createCostAllocation(
  employeeId: string,
  data: {
    project_id?: string
    cost_code?: string
    amount: number
    allocation_date?: string
    period?: string
    notes?: string
  }
): Promise<CostAllocation> {
  const res = await apiClient.post<CostAllocation>(
    `/v1/hr/employees/${employeeId}/cost-allocations`,
    data
  )
  return res.data
}

/**
 * GET /api/v1/hr/employees/{id}/cost-allocations
 */
export async function getEmployeeCostAllocations(employeeId: string): Promise<CostAllocation[]> {
  const res = await apiClient.get<CostAllocation[] | { data: CostAllocation[] }>(
    `/v1/hr/employees/${employeeId}/cost-allocations`
  )
  if (Array.isArray(res.data)) return res.data
  if (res.data && 'data' in res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}
