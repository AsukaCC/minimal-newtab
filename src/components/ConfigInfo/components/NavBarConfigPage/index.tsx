import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setShowNavBar, setNavBarThemeColor, setNavBarItemGap, setNavBarIconSize, setNavItems } from '../../../../store';
import { useI18n } from '../../../../hooks/useI18n';
import type { NavItem } from '../../../../types';
import { defaultNavItems } from '../../../../common/defaultWebsites';
import { DragMoveIcon } from '../../../../common/svgIcon';
import styles from './index.module.css';
import Switch from '../../../Switch';

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
    <DragMoveIcon className={styles.dragIcon} />
  </span>
);

const NavBarConfigPage: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const showNavBar = useAppSelector(
    (state) => (typeof state.config.showNavBar === 'boolean' ? state.config.showNavBar : true),
  );
  const navBarThemeColor = useAppSelector((state) => state.config.navBarThemeColor);
  const navBarItemGap = useAppSelector((state) => state.config.navBarItemGap);
  const navBarIconSize = useAppSelector((state) => state.config.navBarIconSize);
  const storedNavItems = useAppSelector((state) => state.config.navItems);

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

  const handleThemeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setNavBarThemeColor(e.target.value));
    },
    [dispatch],
  );

  const handleItemGapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!Number.isNaN(value) && value >= 0 && value <= 20) {
        dispatch(setNavBarItemGap(value));
      }
    },
    [dispatch],
  );

  const handleIconSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!Number.isNaN(value) && value >= 16 && value <= 64) {
        dispatch(setNavBarIconSize(value));
      }
    },
    [dispatch],
  );

  const handleReset = useCallback(() => {
    if (confirm(t('settings_navBarResetConfigConfirm'))) {
      // 重置配置项到默认值
      dispatch(setNavBarThemeColor('#667eea'));
      dispatch(setNavBarItemGap(2));
      dispatch(setNavBarIconSize(32));
    }
  }, [t, dispatch]);

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

  const getNormalizedHost = useCallback((url: string): string | null => {
    try {
      const u = new URL(url);
      let host = u.hostname.toLowerCase();
      if (host.startsWith('www.')) host = host.slice(4);
      return host;
    } catch {
      return null;
    }
  }, []);

  const findBuiltInIconByUrl = useCallback(
    (url: string): NavItem['icon'] | undefined => {
      const host = getNormalizedHost(url);
      if (!host) return undefined;
      const found = defaultNavItems.find((d) => getNormalizedHost(d.url) === host);
      return found?.icon;
    },
    [getNormalizedHost],
  );

  const handleUrlBlur = useCallback(
    (id: string, value: string) => {
      const trimmed = value.trim();
      const finalUrl = trimmed || 'https://';

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const next: NavItem = { ...item, url: finalUrl };

          if (finalUrl && finalUrl !== 'https://') {
            const builtInIcon = findBuiltInIconByUrl(finalUrl);
            if (builtInIcon) {
              next.icon = builtInIcon;
              next.iconUrl = undefined;
            } else {
              next.icon = undefined;
              next.iconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
                finalUrl,
              )}&sz=64`;
            }
          }

          return next;
        }),
      );

      setEditingUrlId(null);
    },
    [findBuiltInIconByUrl],
  );

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
        </div>
      </div>

      {/* 基础设置分组 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings_basicSettings') || '基础设置'}</h3>
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
      </div>

      {/* 外观设置分组 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings_appearanceSettings') || '外观设置'}</h3>
        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>
              {t('settings_navBarThemeColor') || '图标主题色'}
            </div>
            <div className={styles.visibleDesc}>
              {t('settings_navBarThemeColorDesc') || '自定义底部导航栏图标的颜色'}
            </div>
          </div>
          <input
            type="color"
            value={navBarThemeColor || '#667eea'}
            onChange={handleThemeColorChange}
            className={styles.colorPicker}
            aria-label={t('settings_navBarThemeColor') || '图标主题色'}
          />
        </div>

        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>
              {t('settings_navBarItemGap') || '布局间距'}
            </div>
            <div className={styles.visibleDesc}>
              {t('settings_navBarItemGapDesc') || '调整图标之间的间距大小'}
            </div>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="20"
              value={navBarItemGap || 2}
              onChange={handleItemGapChange}
              className={styles.slider}
              aria-label={t('settings_navBarItemGap') || '布局间距'}
            />
            <span className={styles.sliderValue}>{navBarItemGap || 2}px</span>
          </div>
        </div>

        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>
              {t('settings_navBarIconSize') || '图标大小'}
            </div>
            <div className={styles.visibleDesc}>
              {t('settings_navBarIconSizeDesc') || '调整图标的大小'}
            </div>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="16"
              max="64"
              value={navBarIconSize || 32}
              onChange={handleIconSizeChange}
              className={styles.slider}
              aria-label={t('settings_navBarIconSize') || '图标大小'}
            />
            <span className={styles.sliderValue}>{navBarIconSize || 32}px</span>
          </div>
        </div>
      </div>

      {/* 网站管理分组 */}
      <div className={styles.section}>
        <div className={styles.header}>
          <h3 className={styles.sectionTitle}>{t('settings_websiteManagement') || '网站管理'}</h3>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => {
                if (confirm(t('settings_navBarResetListConfirm') || '确定要重置网站列表吗？此操作将恢复为默认网站，自定义的网站将被清除。')) {
                  setItems(defaultNavItems);
                  setEditingLabelId(null);
                  setEditingUrlId(null);
                }
              }}
              aria-label={t('settings_reset') || '重置'}
            >
              {t('settings_reset') || '重置'}
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => {
                setItems([
                  ...items,
                  {
                    id: `item-${Date.now()}`,
                    label: 'Untitled',
                    url: 'https://',
                  },
                ]);
              }}
              aria-label={t('settings_add') || '添加网站'}
            >
              + {t('settings_add') || '添加网站'}
            </button>
          </div>
        </div>
        <div className={styles.list}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              {t('settings_navBarEmpty') || '暂无网站，点击右上角「添加网站」按钮添加新网站'}
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
    </div>
  );
};

export default NavBarConfigPage;
