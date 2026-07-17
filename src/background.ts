chrome.runtime.onInstalled.addListener(() => {
  console.info('[background] Manifest V3 service worker installed');
});

interface SuggestionRequest {
  type: 'FETCH_GOOGLE_SUGGESTIONS' | 'FETCH_BING_SUGGESTIONS';
  query: string;
}

interface SuggestionResponse {
  success: boolean;
  data: string[];
  error?: string;
}

const fetchSuggestions = async (url: string): Promise<string[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    return [];
  }
  return data[1].filter((item): item is string => typeof item === 'string');
};

const suggestionEndpoints: Record<SuggestionRequest['type'], (query: string) => string> = {
  FETCH_GOOGLE_SUGGESTIONS: (query) =>
    `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
  FETCH_BING_SUGGESTIONS: (query) =>
    `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
};

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    !('query' in message) ||
    typeof message.type !== 'string' ||
    !(message.type in suggestionEndpoints) ||
    typeof message.query !== 'string'
  ) {
    return false;
  }

  const { type, query } = message as SuggestionRequest;
  fetchSuggestions(suggestionEndpoints[type](query))
    .then((data) => sendResponse({ success: true, data } satisfies SuggestionResponse))
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[background] ${type} failed:`, error);
      sendResponse({
        success: false,
        error: errorMessage,
        data: [],
      } satisfies SuggestionResponse);
    });

  // Keep the message channel open until the fetch promise settles.
  return true;
});
