import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setNavItems, setShowNavBar } from '../../../../store';
import { useI18n } from '../../../../hooks/useI18n';
import type { NavItem } from '../../../BottomNavBar';
import styles from './index.module.css';
import Switch from '../../../Switch';

interface NavBarConfigPageProps {
  onClose: () => void;
}

const defaultNavItems: NavItem[] = [
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', icon: 'youtube' },
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chat.openai.com', icon: 'chatgpt' },
  { id: 'github', label: 'GitHub', url: 'https://github.com', icon: 'github' },
  { id: 'x', label: 'X', url: 'https://x.com', icon: 'x' },
];

const DragHandle: React.FC<{ 'aria-label'?: string }> = (props) => (
  <span
    className={styles.dragHandle}
    draggable
    onDragStart={(e) => {
      e.stopPropagation();
      const row = (e.target as HTMLElement).closest('[data-drag-index]');
      if (row?.getAttribute('data-drag-index') != null)
        e.dataTransfer?.setData('text/plain', row.getAttribute('data-drag-index') ?? '');
      e.dataTransfer.effectAllowed = 'move';
    }}
    role="button"
    tabIndex={-1}
    aria-label={props['aria-label']}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  </span>
);

const NavBarConfigPage: React.FC<NavBarConfigPageProps> = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const storedNavItems = useAppSelector((state) => state.config.navItems);
  const showNavBar = useAppSelector(
    (state) => (typeof state.config.showNavBar === 'boolean' ? state.config.showNavBar : true),
  );
  const [items, setItems] = useState<NavItem[]>(storedNavItems || defaultNavItems);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // 任意修改都会立即同步到全局配置
  useEffect(() => {
    dispatch(setNavItems(items));
  }, [items, dispatch]);

  useEffect(() => {
    if (editingLabelId) labelInputRef.current?.focus();
  }, [editingLabelId]);
  useEffect(() => {
    if (editingUrlId) urlInputRef.current?.focus();
  }, [editingUrlId]);

  const handleToggleVisible = useCallback(
    (checked: boolean) => {
      dispatch(setShowNavBar(checked));
    },
    [dispatch],
  );

  const handleAdd = useCallback(() => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        label: t('settings_newItemLabel') || '新项目',
        url: 'https://',
        // 新增项默认不指定内置图标，后续通过 URL 自动生成 favicon
      },
    ]);
  }, [items, t]);

  const handleDelete = useCallback((id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setEditingLabelId((prev) => (prev === id ? null : prev));
    setEditingUrlId((prev) => (prev === id ? null : prev));
  }, [items]);

  const updateItem = useCallback((id: string, patch: Partial<NavItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleLabelBlur = useCallback((id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) updateItem(id, { label: trimmed });
    setEditingLabelId(null);
  }, [updateItem]);

  const handleUrlBlur = useCallback((id: string, value: string) => {
    const trimmed = value.trim();
    const finalUrl = trimmed || 'https://';

    // 更新 URL，并且对于没有内置 icon 的项，基于 URL 自动生成 favicon 地址
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next: NavItem = { ...item, url: finalUrl };

        if (!item.icon && finalUrl && finalUrl !== 'https://') {
          // 使用 Google Favicon API，根据站点 URL 自动生成图标
          next.iconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
            finalUrl,
          )}&sz=64`;
        }

        return next;
      }),
    );

    setEditingUrlId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (confirm(t('settings_navBarResetConfirm') || '确定要重置为默认列表吗？')) {
      setItems(defaultNavItems);
      setEditingLabelId(null);
      setEditingUrlId(null);
    }
  }, [t]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('settings_navBarConfig') || '导航栏配置'}</h2>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
            aria-label={t('settings_reset') || '重置'}
          >
            {t('settings_reset') || '重置'}
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAdd}
            aria-label={t('settings_add') || '添加'}
          >
            + {t('settings_add') || '添加'}
          </button>
        </div>
      </div>

      <div className={styles.visibleRow}>
        <div className={styles.visibleText}>
          <div className={styles.visibleTitle}>
            {t('settings_navBarVisible') || '显示底部导航栏'}
          </div>
          <div className={styles.visibleDesc}>
            {t('settings_navBarVisibleDesc') || '在新标签页底部显示/隐藏导航栏'}
          </div>
        </div>
        <Switch
          checked={showNavBar}
          onChange={handleToggleVisible}
          ariaLabel={t('settings_navBarVisible') || '显示底部导航栏'}
        />
      </div>

      <div className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            {t('settings_navBarEmpty') || '暂无导航项，点击"添加"按钮添加新项目'}
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={styles.item}
              data-drag-index={index}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <DragHandle aria-label={t('settings_dragToSort') || '拖动排序'} />
              <div className={styles.itemBody}>
                <div className={styles.itemInfo}>
                  {editingLabelId === item.id ? (
                    <input
                      ref={labelInputRef}
                      type="text"
                      className={`${styles.inlineInput} ${styles.inlineInputLabel}`}
                      defaultValue={item.label}
                      onBlur={(e) => handleLabelBlur(item.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <span
                      className={styles.itemLabel}
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingLabelId(item.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingLabelId(item.id)}
                    >
                      {item.label}
                    </span>
                  )}
                  {editingUrlId === item.id ? (
                    <input
                      ref={urlInputRef}
                      type="url"
                      className={`${styles.inlineInput} ${styles.inlineInputUrl}`}
                      defaultValue={item.url}
                      onBlur={(e) => handleUrlBlur(item.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <span
                      className={styles.itemUrl}
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingUrlId(item.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingUrlId(item.id)}
                    >
                      {item.url}
                    </span>
                  )}
                </div>
                <div className={styles.itemRight}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(item.id)}
                    aria-label={t('settings_delete') || '删除'}
                  >
                    {t('settings_delete') || '删除'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NavBarConfigPage;
