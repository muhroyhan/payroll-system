import { useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Breadcrumb, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import { useAuth } from '../features/auth/useAuth';
import { StatusTag } from '../components/StatusTag';
import { ROLE_LABELS } from '../features/users/labels';
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  navEntriesForRole,
  requiredRolesFor,
  type AccessEntry,
} from './access';
import styles from './ProtectedLayout.module.css';

const { Header, Sider, Content } = Layout;

function buildMenuItems(entries: readonly AccessEntry[]): MenuProps['items'] {
  return NAV_GROUP_ORDER.filter((group) =>
    entries.some((entry) => entry.group === group),
  ).map((group) => ({
    key: group,
    type: 'group' as const,
    label: NAV_GROUP_LABELS[group],
    children: entries
      .filter((entry) => entry.group === group)
      .map((entry) => ({ key: entry.path, label: entry.label })),
  }));
}

// FE-T04 (09_FRONTEND_STEPS.md) — combines the R-11 route guard with the app
// shell (Sider/Header/breadcrumbs/user menu) in one component: both read
// ACCESS_ENTRIES (routes/access.ts), so nav filtering and access enforcement
// can never drift apart. Not-yet-built feature pages (§15.1) have a nav
// entry here but no matching <Route> in router.tsx yet — clicking one hits
// the "*" NotFoundPage, which is correct: the screen genuinely isn't built.
export function ProtectedLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navEntries = useMemo(
    () => (user ? navEntriesForRole(user.role) : []),
    [user],
  );

  const activeEntry = useMemo(
    () =>
      navEntries.find(
        (entry) =>
          entry.path === '/'
            ? location.pathname === '/'
            : location.pathname === entry.path ||
              location.pathname.startsWith(`${entry.path}/`),
      ),
    [navEntries, location.pathname],
  );

  const menuItems = useMemo(() => buildMenuItems(navEntries), [navEntries]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const requiredRoles = requiredRolesFor(location.pathname);
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => navigate(key);

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', label: 'Keluar' },
  ];
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const breadcrumbItems = activeEntry
    ? [{ title: NAV_GROUP_LABELS[activeEntry.group] }, { title: activeEntry.label }]
    : [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className={styles.logo}>{collapsed ? 'PS' : 'Payroll System'}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={activeEntry ? [activeEntry.path] : []}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Breadcrumb items={breadcrumbItems} />
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            trigger={['click']}
          >
            <span className={styles.userTrigger}>
              <Avatar size="small">{user.name.charAt(0).toUpperCase()}</Avatar>
              {user.name} (<StatusTag value={user.role} labels={ROLE_LABELS} />)
            </span>
          </Dropdown>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
