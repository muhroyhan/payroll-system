import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import { Banknote, Menu as MenuIcon } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { StatusTag } from '../components/StatusTag';
import { usePageTitle } from '../hooks/usePageTitle';
import { ROLE_LABELS } from '../features/users/labels';
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  navEntriesForRole,
  requiredRolesFor,
  type AccessEntry,
} from './access';
import { NAV_GROUP_ICONS, NAV_ICONS } from './navIcons';
import styles from './ProtectedLayout.module.css';

const { Header, Sider, Content } = Layout;

function renderIcon(path: string) {
  const Icon = NAV_ICONS[path];
  return Icon ? <Icon size={16} /> : undefined;
}

// BUGS#11/#12 — a group with more than one entry becomes a collapsible
// SubMenu (antd expands/collapses it natively in mode="inline", no extra
// wiring needed); a group with exactly one entry (Beranda, Kasbon) renders
// that entry directly at the top level instead of a submenu with a single,
// redundant child.
function buildMenuItems(entries: readonly AccessEntry[]): MenuProps['items'] {
  return NAV_GROUP_ORDER.filter((group) => entries.some((entry) => entry.group === group)).map(
    (group) => {
      const groupEntries = entries.filter((entry) => entry.group === group);
      if (groupEntries.length === 1) {
        const [only] = groupEntries;
        return { key: only.path, icon: renderIcon(only.path), label: only.label };
      }
      const GroupIcon = NAV_GROUP_ICONS[group];
      return {
        key: group,
        icon: GroupIcon ? <GroupIcon size={16} /> : undefined,
        label: NAV_GROUP_LABELS[group],
        children: groupEntries.map((entry) => ({
          key: entry.path,
          icon: renderIcon(entry.path),
          label: entry.label,
        })),
      };
    },
  );
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
  const [openKeys, setOpenKeys] = useState<string[]>([]);

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

  // BUGS#12 — whichever group the current route belongs to starts expanded;
  // merged (not replaced) so navigating elsewhere doesn't collapse a group
  // the user opened manually.
  useEffect(() => {
    if (activeEntry) {
      setOpenKeys((prev) =>
        prev.includes(activeEntry.group) ? prev : [...prev, activeEntry.group],
      );
    }
  }, [activeEntry]);

  // BUGS#17 — reuses the same access-entry label the sider/breadcrumb
  // already resolve (single source of truth, R-05) instead of a second
  // route -> title map.
  usePageTitle(activeEntry?.label);

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

  // BUGS#14 — every crumb that has a real page navigates there on click;
  // the group crumb stays plain text (a category, not a page of its own).
  const breadcrumbItems = activeEntry
    ? [
        { title: <a onClick={() => navigate('/')}>Beranda</a> },
        ...(activeEntry.group === 'dashboard'
          ? []
          : [{ title: NAV_GROUP_LABELS[activeEntry.group] }]),
        { title: <a onClick={() => navigate(activeEntry.path)}>{activeEntry.label}</a> },
      ]
    : [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* BUGS#4 — sticky/full-height Sider (antd's own "fixed sider" pattern)
          so only Content scrolls; the Sider no longer scrolls away with it. */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ overflow: 'auto', height: '100vh', position: 'sticky', top: 0, left: 0 }}
      >
        <div className={styles.logo}>
          {/* BUGS#13 — an icon, not a "PS" letter fallback, when collapsed. */}
          {collapsed ? <Banknote size={20} /> : 'Payroll System'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={activeEntry ? [activeEntry.path] : []}
          openKeys={collapsed ? undefined : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys)}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* BUGS#13 — hamburger toggle, top-left, replacing the Sider's
                own bottom-of-rail collapse trigger (trigger={null} above). */}
            <Button
              type="text"
              className={styles.hamburger}
              icon={<MenuIcon size={18} />}
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
            />
            <Breadcrumb items={breadcrumbItems} />
          </div>
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
