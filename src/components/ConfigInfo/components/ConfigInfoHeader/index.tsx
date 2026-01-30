import React, { useState } from 'react';
import styles from '../../index.module.css';
import Button from '../../../Button';

export interface ConfigInfoHeaderProps {
  isLoggedIn: boolean | null;
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onClose: () => void;
  t: (key: string) => string | undefined;
}

const ConfigInfoHeader: React.FC<ConfigInfoHeaderProps> = ({
  isLoggedIn,
  userEmail,
  userName,
  userAvatar,
  isLoggingOut,
  isLoggingIn,
  onLogout,
  onLogin,
  onClose,
  t,
}) => {
  const [isHoveringAccount, setIsHoveringAccount] = useState(false);

  return (
    <>
      <div className={styles.accountWrapper}>
        <div
          className={`${styles.accountInfo} ${isLoggedIn !== true ? styles.accountInfoGuest : ''}`}
          onMouseEnter={() => setIsHoveringAccount(true)}
          onMouseLeave={() => setIsHoveringAccount(false)}
        >
          {isLoggedIn === true ? (
            <>
              <div className={styles.accountAvatar}>
                {userAvatar ? (
                  <img className={styles.avatarImage} src={userAvatar} alt={userEmail || 'Google'} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(userEmail || 'G').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className={styles.accountName}>
                {userName || 'Hi, there!'}
              </span>
              {isHoveringAccount && (
                <div className={styles.logoutButtonWrapper}>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    loading={isLoggingOut}
                    aria-label={t('popup_logout') || '退出登录'}
                  >
                    {t('popup_logout') || '退出登录'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className={styles.accountSignIn}
              onClick={onLogin}
              disabled={isLoggingIn}
              aria-label={t('popup_loginWithGoogle') || '通过Google登录'}
            >
              {isLoggingIn ? (
                <span className={styles.accountSignInSpinner} aria-hidden />
              ) : (
                <img
                  className={styles.accountSignInIcon}
                  src="/icon/google.svg"
                  alt=""
                  aria-hidden
                />
              )}
              <span className={styles.accountSignInText}>
                {t('popup_loginWithGoogle') || '通过Google登录'}
              </span>
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label={t('settings_closeSettings')}
        className={styles.closeButton}
      >
        <svg className={`icon ${styles.closeIcon}`} aria-hidden="true">
          <use xlinkHref="#icon-guanbi"></use>
        </svg>
      </button>
    </>
  );
};

export default ConfigInfoHeader;
