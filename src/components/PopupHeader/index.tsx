import React from 'react';
import styles from './index.module.css';

interface PopupHeaderProps {
  title: string;
}

export const PopupHeader: React.FC<PopupHeaderProps> = ({ title }) => {
  return (
    <div className={styles.header}>
      <h1>{title}</h1>
    </div>
  );
};
