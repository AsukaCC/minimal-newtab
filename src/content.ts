// Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'hello') {
    alert('Hello from React Extension!');
  }
  return true;
});
