import React, { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setShowNavBar,
  setNavBarThemeColor,
  setNavBarItemGap,
  setNavBarIconSize,
} from '../../../../store';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';
import Switch from '../../../Switch';
import WebsiteManagementModal from './WebsiteManagementModal';

const NavBarConfigPage: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const showNavBar = useAppSelector(
    (state) => (typeof state.config.showNavBar === 'boolean' ? state.config.showNavBar : true),
  );
  const navBarThemeColor = useAppSelector((state) => state.config.navBarThemeColor);
  const navBarItemGap = useAppSelector((state) => state.config.navBarItemGap);
  const navBarIconSize = useAppSelector((state) => state.config.navBarIconSize);
  const websiteCount = useAppSelector((state) => state.config.navItems?.length || 0);

  const handleToggleVisible = useCallback(
    (checked: boolean) => dispatch(setShowNavBar(checked)),
    [dispatch],
  );

  const handleThemeColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setNavBarThemeColor(event.target.value));
    },
    [dispatch],
  );

  const handleItemGapChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value) && value >= 0 && value <= 20) {
        dispatch(setNavBarItemGap(value));
      }
    },
    [dispatch],
  );

  const handleIconSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value) && value >= 16 && value <= 64) {
        dispatch(setNavBarIconSize(value));
      }
    },
    [dispatch],
  );

  const handleReset = useCallback(() => {
    if (!confirm(t('settings_navBarResetConfigConfirm'))) return;
    dispatch(setNavBarThemeColor('#667eea'));
    dispatch(setNavBarItemGap(2));
    dispatch(setNavBarIconSize(32));
  }, [t, dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('settings_navBarConfig')}</h2>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
            aria-label={t('settings_reset')}
          >
            {t('settings_reset')}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings_basicSettings')}</h3>
        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>{t('settings_navBarVisible')}</div>
            <div className={styles.visibleDesc}>{t('settings_navBarVisibleDesc')}</div>
          </div>
          <Switch
            checked={showNavBar}
            onChange={handleToggleVisible}
            ariaLabel={t('settings_navBarVisible')}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings_appearanceSettings')}</h3>
        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>{t('settings_navBarThemeColor')}</div>
            <div className={styles.visibleDesc}>{t('settings_navBarThemeColorDesc')}</div>
          </div>
          <input
            type="color"
            value={navBarThemeColor || '#667eea'}
            onChange={handleThemeColorChange}
            className={styles.colorPicker}
            aria-label={t('settings_navBarThemeColor')}
          />
        </div>

        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>{t('settings_navBarItemGap')}</div>
            <div className={styles.visibleDesc}>{t('settings_navBarItemGapDesc')}</div>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="20"
              value={navBarItemGap ?? 2}
              onChange={handleItemGapChange}
              className={styles.slider}
              aria-label={t('settings_navBarItemGap')}
            />
            <span className={styles.sliderValue}>{navBarItemGap ?? 2}px</span>
          </div>
        </div>

        <div className={styles.visibleRow}>
          <div className={styles.visibleText}>
            <div className={styles.visibleTitle}>{t('settings_navBarIconSize')}</div>
            <div className={styles.visibleDesc}>{t('settings_navBarIconSizeDesc')}</div>
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="16"
              max="64"
              value={navBarIconSize ?? 32}
              onChange={handleIconSizeChange}
              className={styles.slider}
              aria-label={t('settings_navBarIconSize')}
            />
            <span className={styles.sliderValue}>{navBarIconSize ?? 32}px</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings_websiteManagement')}</h3>
        <div className={styles.manageSitesCard}>
          <div className={styles.manageSitesContent}>
            <div className={styles.manageSitesText}>
              <div className={styles.manageSitesTitle}>{t('settings_manageSites')}</div>
              <div className={styles.manageSitesDesc}>
                {t('settings_manageSitesDesc')} · {websiteCount}
              </div>
            </div>
            <button
              type="button"
              className={styles.manageSitesButton}
              onClick={() => setIsWebsiteModalOpen(true)}
              aria-label={t('settings_manageSites')}
            >
              {t('settings_manageSites')}
            </button>
          </div>
        </div>
      </div>

      {isWebsiteModalOpen && (
        <WebsiteManagementModal onClose={() => setIsWebsiteModalOpen(false)} />
      )}
    </div>
  );
};

export default NavBarConfigPage;
