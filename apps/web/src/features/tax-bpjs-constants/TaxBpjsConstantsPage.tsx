import { Alert, Tabs } from 'antd';
import { PtkpMasterPage } from './ptkp-master/PtkpMasterPage';
import { TerBracketMasterPage } from './ter-bracket-master/TerBracketMasterPage';
import { BpjsKesehatanMasterPage } from './bpjs-kesehatan-master/BpjsKesehatanMasterPage';
import { BpjsKetenagakerjaanMasterPage } from './bpjs-ketenagakerjaan-master/BpjsKetenagakerjaanMasterPage';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md),
// admin-only. Exactly 4 tabs — verified directly against the controllers,
// not assumed from the docs. `biaya_jabatan_master` and
// `pasal17_bracket_master` (used by the December PPh21 true-up, §7 R7) have
// entity files but NO controller/service/module at all (confirmed: no
// biaya-jabatan-master.controller.ts or pasal17-bracket-master.controller.ts
// exist anywhere in apps/api/src) — there is nothing to build a tab against,
// so this screen does not silently present 4 tabs as complete coverage.
export function TaxBpjsConstantsPage() {
  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hanya 4 dari 6 tabel konstanta pajak/BPJS yang dapat dikelola di sini"
        description="Biaya jabatan dan bracket Pasal 17 (dipakai untuk perhitungan ulang PPh21 bulan Desember) belum punya endpoint admin — API-nya belum dibuat di backend. Keduanya tidak bisa diubah dari halaman ini sampai endpoint tersebut tersedia."
      />
      <Tabs
        items={[
          { key: 'ptkp', label: 'PTKP', children: <PtkpMasterPage /> },
          { key: 'ter', label: 'Bracket TER', children: <TerBracketMasterPage /> },
          {
            key: 'bpjs-kesehatan',
            label: 'BPJS Kesehatan',
            children: <BpjsKesehatanMasterPage />,
          },
          {
            key: 'bpjs-ketenagakerjaan',
            label: 'BPJS Ketenagakerjaan',
            children: <BpjsKetenagakerjaanMasterPage />,
          },
        ]}
      />
    </div>
  );
}
