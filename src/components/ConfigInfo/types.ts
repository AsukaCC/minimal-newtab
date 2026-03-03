import type { ReactNode } from 'react';

export interface PageComponent {
  id: string;
  titleKey?: string;
  title?: string;
  showHeader?: boolean;
  showBack?: boolean;
  actions?: ReactNode;
  component: ReactNode;
}
