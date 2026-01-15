// Content Script
console.log('Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'hello') {
    console.log('Hello from content script!');
    alert('Hello from React Extension!');
  }
  return true;
});
