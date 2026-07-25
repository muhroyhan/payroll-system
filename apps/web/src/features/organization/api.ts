import { apiClient } from '../../api/client';

export interface OrgMasterRecord {
  id: string;
  name: string;
}

export interface OrgMasterInput {
  name: string;
}

// §15.4 (08_FRONTEND_STRUCTURE.md) — divisions/departments/positions/
// employee-types are four identical {id, name} CRUD resources (verified
// against the backend entities/DTOs — all four are the same shape), so one
// generic module serves all four instead of four near-duplicate files.
const RESOURCE_PATHS = {
  divisions: '/divisions',
  departments: '/departments',
  positions: '/positions',
  employeeTypes: '/employee-types',
} as const;

export type OrgMasterKey = keyof typeof RESOURCE_PATHS;

export async function listOrgMaster(key: OrgMasterKey): Promise<OrgMasterRecord[]> {
  const { data } = await apiClient.get<OrgMasterRecord[]>(RESOURCE_PATHS[key]);
  return data;
}

export async function createOrgMaster(
  key: OrgMasterKey,
  input: OrgMasterInput,
): Promise<OrgMasterRecord> {
  const { data } = await apiClient.post<OrgMasterRecord>(RESOURCE_PATHS[key], input);
  return data;
}

export async function updateOrgMaster(
  key: OrgMasterKey,
  id: string,
  input: OrgMasterInput,
): Promise<OrgMasterRecord> {
  const { data } = await apiClient.put<OrgMasterRecord>(
    `${RESOURCE_PATHS[key]}/${id}`,
    input,
  );
  return data;
}

export async function removeOrgMaster(key: OrgMasterKey, id: string): Promise<void> {
  await apiClient.delete(`${RESOURCE_PATHS[key]}/${id}`);
}
