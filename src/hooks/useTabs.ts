import { useState, useEffect } from 'react';

export interface TabInfo {
  id?: number;
  title?: string;
  url?: string;
}

export const useTabs = () => {
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTab({
          id: tabs[0].id,
          title: tabs[0].title,
          url: tabs[0].url,
        });
      }
      setLoading(false);
    });
  }, []);

  const sendMessage = (message: any) => {
    if (currentTab?.id) {
      chrome.tabs.sendMessage(currentTab.id, message);
    }
  };

  return {
    currentTab,
    loading,
    sendMessage,
  };
};
