import { Tabs } from 'antd';
import { OrgMasterTab } from './OrgMasterTab';
import type { OrgMasterKey } from './api';

const TABS: { key: OrgMasterKey; label: string }[] = [
  { key: 'divisions', label: 'Divisi' },
  { key: 'departments', label: 'Departemen' },
  { key: 'positions', label: 'Posisi' },
  { key: 'employeeTypes', label: 'Jenis Karyawan' },
];

// FE-T08 (09_FRONTEND_STEPS.md), §15.4 — 4-tab CRUD page.
export function OrganizationPage() {
  return (
    <Tabs
      items={TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        children: <OrgMasterTab masterKey={tab.key} label={tab.label} />,
      }))}
    />
  );
}
