import { useEffect, useState } from 'react';
import { Select, type SelectProps } from 'antd';
import { useEmployeeQuery, useEmployeesListQuery } from './hooks';

type EmployeeSelectProps = Omit<
  SelectProps<string>,
  'options' | 'onSearch' | 'filterOption' | 'showSearch' | 'loading'
>;

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

// BUGS#9/#10 — every "pilih karyawan" Select used to fetch the WHOLE
// employees table once (useEmployeesQuery()) and filter it client-side
// (showSearch + optionFilterProp="label"). This queries the server instead,
// debounced per keystroke, via the same paginated+searchable endpoint
// EmployeeListPage uses (BUGS#2's listEmployeesPaginated). The currently
// selected id is always fetched by id too and merged in, so an existing
// selection's name still renders even when it isn't on the current search
// page (e.g. opening an edit form before typing anything).
export function EmployeeSelect({ value, ...rest }: EmployeeSelectProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useEmployeesListQuery({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const selectedQuery = useEmployeeQuery(value);

  const options = new Map<string, string>();
  for (const employee of listQuery.data?.items ?? []) {
    options.set(employee.id, employee.name);
  }
  if (value && selectedQuery.data && !options.has(value)) {
    options.set(value, selectedQuery.data.name);
  }

  return (
    <Select<string>
      showSearch
      value={value}
      filterOption={false}
      onSearch={setSearchInput}
      loading={listQuery.isFetching}
      notFoundContent={listQuery.isFetching ? 'Mencari…' : 'Karyawan tidak ditemukan'}
      options={Array.from(options, ([id, name]) => ({ value: id, label: name }))}
      {...rest}
    />
  );
}
