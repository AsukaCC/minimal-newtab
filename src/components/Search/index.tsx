import { useState, useRef, useEffect } from 'react';
import styles from './index.module.css';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { setChooseEngine } from '../../store/configSlice';
import type { SearchEngine } from '../../types.ts';

const Search: React.FC = () => {
  const [searchContent, setSearchContent] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const dispatch = useDispatch();
  const enginesContainerRef = useRef<HTMLDivElement>(null);

  const chooseEngine = useSelector(
    (state: RootState) => state.config.chooseEngine
  );
  const isDirectLink = useSelector(
    (state: RootState) => state.config.isDirectLink
  );

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

  const handleClear = () => {
    setSearchContent('');
  };

  // 处理失去焦点时关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        enginesContainerRef.current &&
        !enginesContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuVisible(false);
      }
    };

    if (isMenuVisible) {
      // 使用 setTimeout 确保点击事件先处理完
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuVisible]);

  return (
    <div className={styles.searchContainer}>
      {/* 搜索引擎选择器 */}
      <div className={styles.enginesContainer} ref={enginesContainerRef}>
        <div className={styles.currentEngine} onClick={toggleMenu}>
          {currentEngine!.key === 'default' ? (
            <svg className={`icon ${styles.defaultIcon}`} aria-hidden="true">
              <use xlinkHref="#icon-sousuo"></use>
            </svg>
          ) : (
            <img
              src={currentEngine!.favicon}
              alt={`${currentEngine!.name} favicon`}
            />
          )}
        </div>

        {isMenuVisible && (
          <div className={styles.enginesList}>
            {initialEngines.map((engine) => (
              <div
                key={engine.key}
                className={`${styles.engineItem} ${
                  engine.key === chooseEngine ? styles.selected : ''
                }`}
                onClick={() => handleEngineChange(engine.key)}>
                {engine.key === 'default' ? (
                  <svg
                    className={`icon ${styles.defaultIcon}`}
                    aria-hidden="true">
                    <use xlinkHref="#icon-sousuo"></use>
                  </svg>
                ) : (
                  <img src={engine.favicon} alt={`${engine.name} favicon`} />
                )}
                <span>{engine.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索输入框和清空按钮 */}
      <div className={styles.inputWrapper}>
        <input
          id="searchInput"
          className={styles.searchInput}
          type="text"
          placeholder="搜索..."
          value={searchContent}
          onChange={(e) => setSearchContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />
        {searchContent && (
          <button
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="清空搜索内容"
            type="button">
            <svg className={`icon ${styles.clearIcon}`} aria-hidden="true">
              <use xlinkHref="#icon-guanbi"></use>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Search;
