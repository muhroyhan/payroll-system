// §5.2 — shared scope-resolution engine. Priority, most specific wins:
// employee > division > department > position > employee_type.
export enum ScopeType {
  EMPLOYEE_TYPE = "employee_type",
  POSITION = "position",
  DEPARTMENT = "department",
  DIVISION = "division",
  EMPLOYEE = "employee",
}

export const SCOPE_TYPE_PRIORITY: ScopeType[] = [
  ScopeType.EMPLOYEE,
  ScopeType.DIVISION,
  ScopeType.DEPARTMENT,
  ScopeType.POSITION,
  ScopeType.EMPLOYEE_TYPE,
];
