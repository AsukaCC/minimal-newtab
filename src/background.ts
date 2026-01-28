// Service Worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// 通用搜索建议获取函数
const fetchSuggestions = async (url: string, engineName: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  const suggestions = data[1] || [];
  console.log(`[background] ${engineName} 搜索建议获取成功，返回 ${suggestions.length} 条建议`);
  return suggestions;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, query } = message;

  // 处理 Google 搜索建议请求（绕过 CORS 限制）
  if (type === 'FETCH_GOOGLE_SUGGESTIONS') {
    fetchSuggestions(
      `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
      'Google'
    )
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.error('[background] 获取 Google 搜索建议失败:', error);
        sendResponse({ success: false, error: error.message, data: [] });
      });
    return true;
  }

  // 处理 Bing 搜索建议请求（绕过 CORS 限制）
  if (type === 'FETCH_BING_SUGGESTIONS') {
    fetchSuggestions(
      `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
      'Bing'
    )
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.error('[background] 获取 Bing 搜索建议失败:', error);
        sendResponse({ success: false, error: error.message, data: [] });
      });
    return true;
  }

  return true;
});
