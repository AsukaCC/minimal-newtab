import React from 'react';
import { useAppSelector } from '../../store/hooks';
import dayjs from 'dayjs';
import styles from './index.module.css';

/**
 * 配置信息组件 - 展示配置的最后修改时间
 * 这是一个示例组件，展示如何使用 updatedAt 字段
 */
export const ConfigInfo: React.FC = () => {
  const updatedAt = useAppSelector((state) => state.config.updatedAt);
  const isDarkMode = useAppSelector((state) => state.config.theme);

  // 格式化日期显示
  const formattedDate = dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss');
  const relativeTime = dayjs(updatedAt).toNow();

  return (
    <div className={styles.container}>
      <div className={styles.infoItem}>
        <span className={styles.label}>当前主题:</span>
        <span className={styles.value}>{isDarkMode ? '暗色' : '亮色'}</span>
      </div>
      <div className={styles.infoItem}>
        <span className={styles.label}>最后修改:</span>
        <span className={styles.value} title={formattedDate}>
          {relativeTime}
        </span>
      </div>
      <div className={styles.infoItem}>
        <span className={styles.label}>修改时间:</span>
        <span className={styles.value}>{formattedDate}</span>
      </div>
    </div>
  );
};
