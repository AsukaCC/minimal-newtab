import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.platform === 'win32' && 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  process.platform === 'win32' && 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.platform === 'darwin' && '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  process.platform === 'linux' && '/usr/bin/google-chrome',
  process.platform === 'linux' && '/usr/bin/chromium',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  throw new Error('Chrome was not found. Set CHROME_PATH to run the UI smoke test.');
}

const pagePath = resolve('dist/newtab.html');
if (!existsSync(pagePath)) {
  throw new Error('dist/newtab.html does not exist. Run npm run build first.');
}

const profileDir = await mkdtemp(join(tmpdir(), 'miniTab-ui-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--allow-file-access-from-files',
  '--disable-gpu',
  '--no-first-run',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--window-size=1440,900',
  pathToFileURL(pagePath).href,
], { stdio: 'ignore', windowsHide: true });
const chromeExited = new Promise((resolveExit) => chrome.once('exit', resolveExit));

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForDevToolsPort() {
  const portFile = join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const [port] = (await readFile(portFile, 'utf8')).split(/\r?\n/);
      if (port) return port;
    } catch {
      // Chrome has not initialized the profile yet.
    }
    await delay(250);
  }
  throw new Error('Chrome DevTools endpoint did not become ready.');
}

async function waitForPageTarget(port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const page = targets.find((target) => target.type === 'page');
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    await delay(100);
  }
  throw new Error('Chrome page target was not found.');
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  return {
    ready: new Promise((resolveReady, rejectReady) => {
      socket.addEventListener('open', resolveReady, { once: true });
      socket.addEventListener('error', rejectReady, { once: true });
    }),
    request(method, params = {}) {
      return new Promise((resolveRequest, rejectRequest) => {
        const id = nextId++;
        pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    closeBrowser() {
      socket.send(JSON.stringify({ id: nextId++, method: 'Browser.close' }));
    },
  };
}

try {
  const port = await waitForDevToolsPort();
  const client = connectCdp(await waitForPageTarget(port));
  await client.ready;
  await delay(800);

  const evaluation = await client.request('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const input = document.querySelector('#searchInput');
      const search = input?.parentElement?.parentElement;
      if (!input || !search) throw new Error('Search UI was not rendered');

      const widthBeforeFocus = search.offsetWidth;
      input.focus();
      await delay(350);
      const widthAfterFocus = search.offsetWidth;

      const settingsButton = document.querySelector('button');
      if (!settingsButton) throw new Error('Settings button was not rendered');
      settingsButton.click();
      await delay(500);

      const panel = [...document.querySelectorAll('div')].find((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.position === 'fixed' && style.right === '0px' && rect.width >= 400 && rect.width <= 500;
      });
      if (!panel) throw new Error('Settings panel was not rendered');

      const panelRect = panel.getBoundingClientRect();
      const navConfig = panel.querySelector('[aria-label="settings_navBarConfig"]');
      if (!navConfig) throw new Error('Navigation settings entry was not rendered');
      navConfig.click();
      await delay(450);

      const slidingWrapper = panel.firstElementChild;
      const pageShift = new DOMMatrix(getComputedStyle(slidingWrapper).transform).m41;

      const manageSitesButton = panel.querySelector('[aria-label="settings_manageSites"]');
      if (!manageSitesButton) throw new Error('Website management entry was not rendered');
      manageSitesButton.click();
      await delay(400);

      const websiteDialog = document.querySelector(
        '[role="dialog"][aria-labelledby="website-management-title"]',
      );
      if (!websiteDialog) throw new Error('Website management dialog was not rendered');
      const websiteDialogRect = websiteDialog.getBoundingClientRect();

      const librarySearch = websiteDialog.querySelector('[aria-label="settings_searchAiWebsites"]');
      if (!librarySearch) throw new Error('AI website library was not rendered');
      const library = librarySearch.parentElement;
      const libraryCards = [...library.querySelectorAll('strong')];
      const librarySiteCount = libraryCards.length;
      const libraryIconCount = libraryCards.filter(
        (label) => label.parentElement?.parentElement?.querySelector('svg'),
      ).length;

      const inputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set;
      inputValueSetter.call(librarySearch, 'Suno');
      librarySearch.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(100);
      const filteredSiteCount = library.querySelectorAll('strong').length;
      inputValueSetter.call(librarySearch, '');
      librarySearch.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(100);

      const categoryButtons = [...library.querySelectorAll('[role="group"] button')];
      const categorySiteCounts = [];
      for (const categoryButton of categoryButtons) {
        categoryButton.click();
        await delay(60);
        categorySiteCounts.push(library.querySelectorAll('strong').length);
      }
      const groupedCards = [...library.querySelectorAll('strong')]
        .map((label) => label.parentElement?.parentElement)
        .filter(Boolean);
      const groupedSiteCount = groupedCards.length;
      const maxFilteredCardHeight = Math.max(
        ...groupedCards.map((card) => card.getBoundingClientRect().height),
      );
      categoryButtons[0].click();
      await delay(100);

      const copilotLabel = [...library.querySelectorAll('strong')]
        .find((element) => element.textContent === 'Microsoft Copilot');
      const copilotCard = copilotLabel?.parentElement?.parentElement;
      const copilotButton = copilotCard?.querySelector('button');
      if (!copilotButton || copilotButton.disabled) {
        throw new Error('Microsoft Copilot could not be added from the library');
      }
      copilotButton.click();
      await delay(150);
      const copilotAdded = copilotButton.disabled;

      const copilotCurrentRow = websiteDialog.querySelector('[data-site-id="copilot"]');
      const svgFileInput = copilotCurrentRow?.querySelector('input[type="file"]');
      if (!svgFileInput) throw new Error('Custom SVG upload control was not rendered');
      const unsafeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>alert(1)</script><image href="https://example.com/tracker.png"/><path d="M4 4h16v16H4z"/></svg>';
      const svgTransfer = new DataTransfer();
      svgTransfer.items.add(new File([unsafeSvg], 'custom-icon.svg', { type: 'image/svg+xml' }));
      svgFileInput.files = svgTransfer.files;
      svgFileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(150);
      const customIconImage = copilotCurrentRow.querySelector('img[src^="data:image/svg+xml"]');
      const sanitizedSvg = customIconImage
        ? decodeURIComponent(customIconImage.src.split(',').slice(1).join(','))
        : '';
      const customSvgUploaded = Boolean(customIconImage) &&
        sanitizedSvg.includes('<path') &&
        !sanitizedSvg.includes('<script') &&
        !sanitizedSvg.includes('onload') &&
        !sanitizedSvg.includes('<image');

      const currentRows = [...websiteDialog.querySelectorAll('[data-site-id]')];
      const draggedId = currentRows[0].dataset.siteId;
      const dragTransfer = new DataTransfer();
      currentRows[0].querySelector('[draggable="true"]').dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, dataTransfer: dragTransfer }),
      );
      await delay(20);
      currentRows[1].dispatchEvent(
        new DragEvent('dragenter', { bubbles: true, dataTransfer: dragTransfer }),
      );
      await delay(20);
      currentRows[1].dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dragTransfer }),
      );
      await delay(40);
      const reorderedRows = [...websiteDialog.querySelectorAll('[data-site-id]')];
      const dragReordered = reorderedRows[1]?.dataset.siteId === draggedId;
      const dropAnimationActive = websiteDialog.querySelector(
        '[data-reorder-animating="true"]',
      ) !== null;
      await delay(300);

      document.activeElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await delay(300);
      const websiteDialogClosed = !document.querySelector(
        '[role="dialog"][aria-labelledby="website-management-title"]',
      );
      const panelStillOpen = panel.getBoundingClientRect().right === window.innerWidth;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await delay(400);
      const backShift = new DOMMatrix(getComputedStyle(slidingWrapper).transform).m41;

      return {
        searchWidthShift: Math.abs(widthAfterFocus - widthBeforeFocus),
        panelRight: panelRect.right,
        viewportWidth: window.innerWidth,
        panelWidth: panelRect.width,
        panelClientWidth: panel.clientWidth,
        pageShift,
        backShift,
        librarySiteCount,
        libraryIconCount,
        filteredSiteCount,
        categorySiteCounts,
        groupedSiteCount,
        maxFilteredCardHeight,
        copilotAdded,
        customSvgUploaded,
        dragReordered,
        dropAnimationActive,
        websiteDialogWidth: websiteDialogRect.width,
        websiteDialogHeight: websiteDialogRect.height,
        websiteDialogClosed,
        panelStillOpen,
      };
    })()`,
  });

  const result = evaluation.result.value;
  if (!result || result.searchWidthShift > 0.5) {
    throw new Error(`Search focus caused layout movement: ${result?.searchWidthShift}`);
  }
  if (Math.abs(result.panelRight - result.viewportWidth) > 1 || result.panelWidth < 400) {
    throw new Error(`Settings panel did not finish opening: ${JSON.stringify(result)}`);
  }
  if (Math.abs(result.pageShift + result.panelClientWidth) > 1 || Math.abs(result.backShift) > 1) {
    throw new Error(`Settings page transition did not settle: ${JSON.stringify(result)}`);
  }
  if (
    result.librarySiteCount !== 53 ||
    result.libraryIconCount !== 53 ||
    result.filteredSiteCount !== 1 ||
    JSON.stringify(result.categorySiteCounts) !== JSON.stringify([53, 23, 5, 7, 9, 9]) ||
    result.groupedSiteCount !== 9 ||
    result.maxFilteredCardHeight > 55 ||
    !result.copilotAdded ||
    !result.customSvgUploaded ||
    !result.dragReordered ||
    !result.dropAnimationActive ||
    result.websiteDialogWidth < 800 ||
    result.websiteDialogHeight < 600 ||
    !result.websiteDialogClosed ||
    !result.panelStillOpen
  ) {
    throw new Error(`AI website library interaction failed: ${JSON.stringify(result)}`);
  }

  await client.request('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.request('Page.reload', { ignoreCache: true });
  await delay(900);

  const mobileEvaluation = await client.request('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const settingsButton = document.querySelector('[aria-label="settings_openSettings"]');
      if (!settingsButton) throw new Error('Mobile settings button was not rendered');
      settingsButton.click();
      await delay(450);

      const navConfig = document.querySelector('[aria-label="settings_navBarConfig"]');
      if (!navConfig) throw new Error('Mobile navigation settings entry was not rendered');
      navConfig.click();
      await delay(400);

      const manageSitesButton = document.querySelector('[aria-label="settings_manageSites"]');
      if (!manageSitesButton) throw new Error('Mobile website management entry was not rendered');
      manageSitesButton.click();
      await delay(400);

      const dialog = document.querySelector(
        '[role="dialog"][aria-labelledby="website-management-title"]',
      );
      if (!dialog) throw new Error('Mobile website dialog was not rendered');
      const rect = dialog.getBoundingClientRect();
      const firstCard = dialog.querySelector('strong')?.parentElement?.parentElement;
      const firstCardRect = firstCard?.getBoundingClientRect();
      const horizontalOverflow = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - window.innerWidth;

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dialogWidth: rect.width,
        dialogHeight: rect.height,
        horizontalOverflow,
        firstCardLeft: firstCardRect?.left,
        firstCardRight: firstCardRect?.right,
      };
    })()`,
  });

  const mobileResult = mobileEvaluation.result.value;
  if (
    !mobileResult ||
    Math.abs(mobileResult.dialogWidth - mobileResult.viewportWidth) > 1 ||
    Math.abs(mobileResult.dialogHeight - mobileResult.viewportHeight) > 1 ||
    mobileResult.horizontalOverflow > 1 ||
    mobileResult.firstCardLeft < 0 ||
    mobileResult.firstCardRight > mobileResult.viewportWidth
  ) {
    throw new Error(`Mobile website dialog layout failed: ${JSON.stringify(mobileResult)}`);
  }

  console.log('UI animation and built-in website library smoke test passed', {
    ...result,
    mobile: mobileResult,
  });
  client.closeBrowser();
  await delay(300);
} finally {
  if (chrome.exitCode === null) chrome.kill();
  await Promise.race([chromeExited, delay(2000)]);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(200);
    }
  }
}
