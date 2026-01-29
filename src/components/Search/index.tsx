import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './index.module.css';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/types';
import { setChooseEngine } from '../../store';
import type { SearchEngine } from '../../types.ts';
import { useI18n } from '../../hooks/useI18n';
import Button from '../Button';

const Search: React.FC = () => {
  const [searchContent, setSearchContent] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const dispatch = useDispatch();
  const { t } = useI18n();
  const enginesContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chooseEngine = useSelector((state: RootState) => state.config.chooseEngine);
  const isDirectLinkValue = useSelector((state: RootState) => state.config.isDirectLink);
  const isDirectLink = Boolean(
    isDirectLinkValue === true ||
    (typeof isDirectLinkValue === 'string' && isDirectLinkValue === 'true')
  );

  // 通用搜索函数生成器
  const createWebSearchFunction = useCallback((url: string, paramKey: string = 'q') => {
    return (text: string) => {
      const searchUrl = `${url}${paramKey}=${encodeURIComponent(text)}`;
      isDirectLink ? (window.location.href = searchUrl) : window.open(searchUrl, '_blank');
    };
  }, [isDirectLink]);

  // 通用 chrome.runtime.sendMessage Promise 包装
  const sendChromeMessage = useCallback(<T,>(type: string, query: string): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!chrome?.runtime?.sendMessage) {
      return Promise.resolve({ success: false, error: 'chrome.runtime.sendMessage 不可用', data: [] as T });
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, query }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`[Search] 发送消息失败:`, chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message, data: [] as T });
        } else {
          resolve(response || { success: false, data: [] as T });
        }
      });
    });
  }, []);

  // 清理建议状态
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  // 保持输入框焦点
  const maintainFocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // 默认搜索引擎搜索函数（带回退）
  const defaultSearchFunction = useCallback((text: string) => {
    const fallbackSearch = createWebSearchFunction('https://www.google.com/search?', 'q');

    if (!chrome?.search?.query) {
      console.warn('[Search] chrome.search API 不可用，使用 Google 搜索');
      fallbackSearch(text);
      return;
    }

    try {
      console.log('[Search] 使用浏览器默认搜索引擎搜索:', text);
      chrome.search.query({
        text,
        disposition: isDirectLink ? 'CURRENT_TAB' : 'NEW_TAB',
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Search] chrome.search.query 错误:', chrome.runtime.lastError.message);
          fallbackSearch(text);
        } else {
          console.log('[Search] 浏览器默认搜索引擎搜索成功');
        }
      });
    } catch (error) {
      console.error('[Search] 调用 chrome.search.query 时发生异常:', error);
      fallbackSearch(text);
    }
  }, [createWebSearchFunction, isDirectLink]);

  const initialEngines: SearchEngine[] = [
    {
      key: 'default',
      name: t('search_defaultEngine'),
      favicon: 'icon/default-search.svg',
      searchFunction: defaultSearchFunction,
    },
    {
      key: 'google',
      name: t('engines_google'),
      favicon: 'icon/google.svg',
      searchFunction: createWebSearchFunction('https://www.google.com/search?', 'q'),
    },
    {
      key: 'bing',
      name: t('engines_bing'),
      favicon: 'icon/bing.svg',
      searchFunction: createWebSearchFunction('https://www.bing.com/search?', 'q'),
    },
    {
      key: 'baidu',
      name: t('engines_baidu'),
      favicon: 'icon/baidu.svg',
      searchFunction: createWebSearchFunction('https://www.baidu.com/s?', 'wd'),
    },
  ];

  const currentEngine = initialEngines.find((engine) => engine.key === chooseEngine) || initialEngines[0];

  const handleEngineChange = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch(setChooseEngine(key));
    setIsMenuVisible(false);
    maintainFocus();
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuVisible((prev) => !prev);
    maintainFocus();
  };

  const handleClear = () => {
    setSearchContent('');
    clearSuggestions();
  };

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (query: string, engineKey: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    console.log('[Search] 获取搜索建议 - 引擎:', engineKey, '查询:', query);
    setIsLoadingSuggestions(true);
    try {
      let messageType = 'FETCH_GOOGLE_SUGGESTIONS';

      if (engineKey === 'bing') {
        messageType = 'FETCH_BING_SUGGESTIONS';
      }
      // 'baidu' 和 'default' 都使用 Google 建议

      const response = await sendChromeMessage<string[]>(messageType, query);

      if (response.success && response.data) {
        const finalSuggestions = response.data.slice(0, 8);
        console.log(`[Search] ${engineKey} 搜索建议获取成功，返回 ${finalSuggestions.length} 条建议`);
        setSuggestions(finalSuggestions);
      } else {
        console.warn(`[Search] ${engineKey} 搜索建议请求失败:`, response.error);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('[Search] 获取搜索建议失败:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [sendChromeMessage]);

  // 防抖处理搜索建议
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchContent.trim()) {
      clearSuggestions();
      return;
    }

    clearSuggestions();
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchContent, chooseEngine);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchContent, chooseEngine, fetchSuggestions, clearSuggestions]);

  // 执行搜索
  const performSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !currentEngine) return;

    setSearchContent(trimmedQuery);
    clearSuggestions();
    currentEngine.searchFunction(trimmedQuery);
  }, [currentEngine, clearSuggestions]);

  // 处理建议项点击
  const handleSuggestionClick = (suggestion: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    performSearch(suggestion);
  };

  // 键盘导航处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const query = searchContent.trim();
      if (!query) {
        console.log('[Search] 搜索内容为空，跳过搜索');
        return;
      }

      // 如果有选中的建议，使用建议；否则使用当前输入
      const searchQuery = suggestions.length > 0 && selectedIndex >= 0 && selectedIndex < suggestions.length
        ? suggestions[selectedIndex].trim()
        : query;

      if (searchQuery) {
        console.log('[Search] 执行搜索:', searchQuery);
        performSearch(searchQuery);
      }
      return;
    }

    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        e.preventDefault();
        clearSuggestions();
        break;
    }
  };

  // 处理失去焦点时关闭菜单和建议列表
  useEffect(() => {
    if (!isMenuVisible && suggestions.length === 0) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        enginesContainerRef.current?.contains(target) ||
        inputRef.current?.contains(target) ||
        suggestionsRef.current?.contains(target)
      ) {
        return;
      }

      setIsMenuVisible(false);
      clearSuggestions();
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuVisible, suggestions.length, clearSuggestions]);

  // 渲染引擎图标
  const renderEngineIcon = (engine: SearchEngine, className?: string) => {
    if (engine.key === 'default') {
      return (
        <svg className={`icon ${styles.defaultIcon} ${className || ''}`} aria-hidden="true">
          <use xlinkHref="#icon-sousuo"></use>
        </svg>
      );
    }
    return (
      <img
        src={engine.favicon}
        alt={`${engine.name} favicon`}
        className={className}
      />
    );
  };

  return (
    <div className={styles.searchContainer}>
      {/* 搜索引擎选择器 */}
      <div className={styles.enginesContainer} ref={enginesContainerRef}>
        <div className={styles.currentEngine} onClick={toggleMenu} onMouseDown={(e) => e.preventDefault()}>
          {renderEngineIcon(currentEngine!)}
        </div>

        {isMenuVisible && (
          <div className={styles.enginesList} onMouseDown={(e) => e.preventDefault()}>
            {initialEngines.map((engine) => (
              <div
                key={engine.key}
                className={`${styles.engineItem} ${
                  engine.key === chooseEngine ? styles.selected : ''
                }`}
                onClick={(e) => handleEngineChange(engine.key, e)}
                onMouseDown={(e) => e.preventDefault()}>
                {renderEngineIcon(engine)}
                <span>{engine.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索输入框和清空按钮 */}
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          id="searchInput"
          className={styles.searchInput}
          type="text"
          placeholder={t('search_placeholder')}
          value={searchContent}
          onChange={(e) => setSearchContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchContent && (
          <Button
            variant="primary"
            iconOnly
            size="small"
            onClick={handleClear}
            aria-label={t('search_clearSearch')}
            type="button"
            className={styles.clearButton}>
            <svg className={`icon ${styles.clearIcon}`} aria-hidden="true">
              <use xlinkHref="#icon-guanbi"></use>
            </svg>
          </Button>
        )}

        {/* 搜索建议列表 */}
        {suggestions.length > 0 && (
          <div className={styles.suggestionsList} ref={suggestionsRef}>
            {isLoadingSuggestions && (
              <div className={styles.suggestionItem}>
                <span>{t('search_loading')}</span>
              </div>
            )}
            {!isLoadingSuggestions &&
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`${styles.suggestionItem} ${
                    index === selectedIndex ? styles.selected : ''
                  }`}
                  onClick={(e) => handleSuggestionClick(suggestion, e)}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setSelectedIndex(index)}>
                  <span className={styles.suggestionText}>{suggestion}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
