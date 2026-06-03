export type Tier = 'general' | 'user' | 'admin';

export interface ModuleDefinition {
  id: string;
  label: string;
  path: string;
  icon: string;
  tier: Tier[];
  description: string;
}

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard/dashboard.html',
    icon: 'dashboard',
    tier: ['general', 'user', 'admin'],
    description: 'Overview and quick access to all tools.',
  },
  {
    id: 'tags',
    label: 'Tags Generator',
    path: '/tags/index.html',
    icon: 'tag',
    tier: ['general', 'user', 'admin'],
    description: 'Create printable product tags.',
  },
  {
    id: 'statements',
    label: 'Statements',
    path: '/statements/index.html',
    icon: 'receipt',
    tier: ['general', 'user', 'admin'],
    description: 'Generate stock movement statements.',
  },
  {
    id: 'restock',
    label: 'Restock',
    path: '/restock/restock.html',
    icon: 'inventory',
    tier: ['user', 'admin'],
    description: 'Submit inventory restock requests and view restock data.',
  },
  {
    id: 'logs',
    label: 'Logs',
    path: '/logs/logs.html',
    icon: 'history',
    tier: ['admin'],
    description: 'Review activity logs for the system.',
  },
  {
    id: 'users',
    label: 'Users',
    path: '/users/users.html',
    icon: 'people',
    tier: ['admin'],
    description: 'Manage and review user accounts.',
  },
];

