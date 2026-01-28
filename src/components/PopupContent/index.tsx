import React from 'react';
import { useTabs } from '../../hooks/useTabs';
import styles from './index.module.css';
import { useI18n } from '../../hooks/useI18n';
import Button from '../Button';

interface PopupContentProps {
  message?: string;
}

export const PopupContent: React.FC<PopupContentProps> = ({
  message,
}) => {
  const { t } = useI18n();
  const { sendMessage, loading } = useTabs();

  const handleSendMessage = () => {
    sendMessage({ action: 'hello' });
  };

  return (
    <div className={styles.content}>
      <p>{message || t('popup.welcomeMessage')}</p>
      <Button
        variant="primary"
        onClick={handleSendMessage}
        disabled={loading}
        loading={loading}>
        {t('popup.sendMessage')}
      </Button>
    </div>
  );
};
