import React, { useMemo, useState } from 'react';
import {
  builtInWebsites,
  findBuiltInWebsiteByUrl,
  type AiWebsiteCategory,
  type BuiltInWebsite,
} from '../../../../common/defaultWebsites';
import { siteIconByKey } from '../../../../common/siteIconCatalog';
import { useI18n } from '../../../../hooks/useI18n';
import type { NavItem } from '../../../../types';
import styles from './index.module.css';

type CategoryFilter = 'all' | 'ai' | 'video' | 'music' | 'technology' | 'news';

const aiCategories: AiWebsiteCategory[] = [
  'assistant',
  'search',
  'creative',
  'developer',
];

interface SiteLibraryProps {
  items: NavItem[];
  onAdd: (website: BuiltInWebsite) => void;
}

const categoryKeys: Array<{
  value: CategoryFilter;
  labelKey: string;
}> = [
  { value: 'all', labelKey: 'settings_aiCategoryAll' },
  { value: 'ai', labelKey: 'settings_siteCategoryAi' },
  { value: 'video', labelKey: 'settings_siteCategoryVideo' },
  { value: 'music', labelKey: 'settings_siteCategoryMusic' },
  { value: 'technology', labelKey: 'settings_siteCategoryTechnology' },
  { value: 'news', labelKey: 'settings_siteCategoryNews' },
];

const SiteLibrary: React.FC<SiteLibraryProps> = ({ items, onAdd }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const addedIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => findBuiltInWebsiteByUrl(item.url)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    [items],
  );

  const filteredWebsites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return builtInWebsites.filter((website) => {
      const matchesCategory =
        category === 'all' ||
        website.category === category ||
        (category === 'ai' &&
          aiCategories.includes(website.category as AiWebsiteCategory));
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      return `${website.label} ${website.url}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [category, query]);

  return (
    <div className={styles.library}>
      <div className={styles.libraryHeading}>
        <div>
          <h4 className={styles.libraryTitle}>
            {t('settings_aiWebsiteLibrary')}
          </h4>
          <p className={styles.libraryDescription}>
            {t('settings_aiWebsiteLibraryDesc')}
          </p>
        </div>
        <span className={styles.libraryCount}>{builtInWebsites.length}</span>
      </div>

      <input
        className={styles.librarySearch}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('settings_searchAiWebsites')}
        aria-label={t('settings_searchAiWebsites')}
      />

      <div className={styles.categoryTabs} role="group" aria-label={t('settings_aiWebsiteLibrary')}>
        {categoryKeys.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`${styles.categoryTab} ${
              category === item.value ? styles.categoryTabActive : ''
            }`}
            aria-pressed={category === item.value}
            onClick={() => setCategory(item.value)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {filteredWebsites.length === 0 ? (
        <div className={styles.libraryEmpty}>{t('settings_noMatchingAiWebsites')}</div>
      ) : (
        <div className={styles.libraryGrid}>
          {filteredWebsites.map((website) => {
            const Icon = siteIconByKey[website.icon];
            const isAdded = addedIds.has(website.id);
            return (
              <div className={styles.libraryItem} key={website.id}>
                <span className={styles.libraryIcon} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles.libraryItemText}>
                  <strong>{website.label}</strong>
                  <small>{new URL(website.url).hostname.replace(/^www\./, '')}</small>
                </span>
                <button
                  type="button"
                  className={`${styles.libraryAddButton} ${
                    isAdded ? styles.libraryAddedButton : ''
                  }`}
                  disabled={isAdded}
                  onClick={() => onAdd(website)}
                  aria-label={`${isAdded ? t('settings_added') : t('settings_add')} ${website.label}`}
                  title={isAdded ? t('settings_added') : t('settings_add')}
                >
                  {isAdded ? '\u2713' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SiteLibrary;
