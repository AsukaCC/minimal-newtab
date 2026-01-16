import React from 'react';
import styles from './index.module.css';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 'medium', className }) => {
  return (
    <div className={`${styles.loading} ${styles[size]} ${className || ''}`}>
      <div className={styles.spinner}></div>
    </div>
  );
};

export default Loading;
