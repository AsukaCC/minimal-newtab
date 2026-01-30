import React from 'react';
import styles from '../../index.module.css';

export interface ConfigInfoSubHeaderProps {
  activeSubPage: string | null;
  onBack: () => void;
  t: (key: string) => string | undefined;
}

const ConfigInfoSubHeader: React.FC<ConfigInfoSubHeaderProps> = ({
  activeSubPage,
  onBack,
  t,
}) => {
  return (
    <div className={styles.headerLeft}>
      <button
        onClick={onBack}
        aria-label={t('common_back')}
        className={styles.backButton}
      >
        <svg
          className={`icon ${styles.backIcon}`}
          aria-hidden="true"
          viewBox="0 0 24 24"
        >
          <path
            d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            fill="currentColor"
          />
        </svg>
      </button>
      <h2 className={styles.subPageTitle}>
        {activeSubPage === 'syncHistory'
          ? t('popup_syncTitle')
          : activeSubPage === 'themeLanguage'
            ? t('settings_themeAndLanguage')
            : ''}
      </h2>
    </div>
  );
};

export default ConfigInfoSubHeader;
