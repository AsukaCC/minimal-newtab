import React from 'react';
import { useTabs } from '../../hooks/useTabs';
import styles from './index.module.css';

interface PopupContentProps {
  message?: string;
}

export const PopupContent: React.FC<PopupContentProps> = ({
  message = '欢迎使用 React + Vite Chrome Extension 脚手架！',
}) => {
  const { sendMessage, loading } = useTabs();

  const handleSendMessage = () => {
    sendMessage({ action: 'hello' });
  };

  return (
    <div className={styles.content}>
      <p>{message}</p>
      <button
        className={styles.button}
        onClick={handleSendMessage}
        disabled={loading}>
        发送消息
      </button>
    </div>
  );
};
