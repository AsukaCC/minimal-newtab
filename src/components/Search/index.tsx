import { useState } from 'react';
import styles from './index.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux';
import { setChooseEngine } from '@/redux/slice/configSlice';
import { SearchEngine } from '@/types';

const Search: React.FC = () => {
  const [searchContent, setSearchContent] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const dispatch = useDispatch();

  const initialEngines: SearchEngine[] = [
    {
      key: 'default',
      name: '默认',
      favicon: 'icon/default-search.svg',
      searchFunction: (text: string) => {
        if (!chrome?.search?.query) {
          return;
        }
        chrome.search.query({
          text,
          disposition: isDirectLink ? 'CURRENT_TAB' : 'NEW_TAB',
        });
      },
    },
    {
      key: 'google',
      name: 'Google',
      favicon: 'icon/google.svg',
      searchFunction: (text: string) => {
        if (isDirectLink) {
          window.location.href = `https://www.google.com/search?q=${text}`;
        } else {
          window.open(`https://www.google.com/search?q=${text}`, '_blank');
        }
      },
    },
    {
      key: 'bing',
      name: 'Bing',
      favicon: 'icon/bing.svg',
      searchFunction: (text: string) => {
        if (isDirectLink) {
          window.location.href = `https://www.bing.com/search?q=${text}`;
        } else {
          window.open(`https://www.bing.com/search?q=${text}`, '_blank');
        }
      },
    },
    {
      key: 'baidu',
      name: '百度',
      favicon: 'icon/baidu.svg',
      searchFunction: (text: string) => {
        if (isDirectLink) {
          window.location.href = `https://www.baidu.com/s?wd=${text}`;
        } else {
          window.open(`https://www.baidu.com/s?wd=${text}`, '_blank');
        }
      },
    },
  ];

  const chooseEngine = useSelector(
    (state: RootState) => state.config.chooseEngine
  );
  const isDirectLink = useSelector(
    (state: RootState) => state.config.isDirectLink
  );

  const currentEngine =
    initialEngines.find((engine) => engine.key === chooseEngine) ||
    initialEngines[0];

  const search = () => {
    currentEngine?.searchFunction(searchContent);
  };

  const handleEngineChange = (key: string) => {
    dispatch(setChooseEngine(key));
    setIsMenuVisible(false);
  };

  const toggleMenu = () => {
    setIsMenuVisible((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuVisible(false);
  };

  return (
    <div className={styles.searchContainer}>
      {/* 搜索引擎选择器 */}
      <div className={styles.enginesContainer}>
        <div className={styles.currentEngine} onClick={toggleMenu}>
          <img
            src={currentEngine!.favicon}
            alt={`${currentEngine!.name} favicon`}
          />
        </div>

        {isMenuVisible && (
          <>
            <div className={styles.overlay} onClick={closeMenu}></div>
            <div className={styles.enginesList}>
              {initialEngines.map((engine) => (
                <div
                  key={engine.key}
                  className={styles.engineItem}
                  onClick={() => handleEngineChange(engine.key)}>
                  <img src={engine.favicon} alt={`${engine.name} favicon`} />
                  <span>{engine.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 搜索输入框和按钮 */}
      <input
        className={styles.searchInput}
        type="text"
        placeholder="搜索..."
        value={searchContent}
        onChange={(e) => setSearchContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
      />
      <div className={styles.searchButton} onClick={search}>
        <svg className={`icon ${styles.searchIcon}`} aria-hidden="true">
          <use xlinkHref="#icon-sousuo"></use>
        </svg>
      </div>
    </div>
  );
};

export default Search;
