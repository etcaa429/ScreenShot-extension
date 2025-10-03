// 背景腳本 - Manifest V3 Service Worker版本

// 安裝事件
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('[Screenshot V3] Extension installed:', details.reason);

    // 初始化設置
    initializeSettings();

    // 創建右鍵菜單
    createContextMenus();
});

// 初始化設置
async function initializeSettings() {
    try {
        const result = await chrome.storage.local.get(['screenshotSettings', 'screenshotHistory']);

        if (!result.screenshotSettings) {
            const defaultSettings = {
                autoSave: true,
                savePath: 'Screenshots',
                filenameRule: 'screenshot_####',
                counter: 1
            };
            await chrome.storage.local.set({screenshotSettings: defaultSettings});
            console.log('[Screenshot V3] Default settings initialized');
        }

        if (!result.screenshotHistory) {
            await chrome.storage.local.set({screenshotHistory: []});
            console.log('[Screenshot V3] History initialized');
        }
    } catch (error) {
        console.error('[Screenshot V3] Initialize error:', error);
    }
}

// 創建右鍵菜單
function createContextMenus() {
    // 先移除所有現有菜單
    chrome.contextMenus.removeAll(function() {
        // 主菜單
        chrome.contextMenus.create({
            id: 'screenshotMain',
            title: '截圖工具',
            contexts: ['page', 'selection', 'image', 'link']
        });

        // 單頁截圖
        chrome.contextMenus.create({
            id: 'normalScreenshot',
            parentId: 'screenshotMain',
            title: '單頁截圖',
            contexts: ['page']
        });

        // 滾動截圖
        chrome.contextMenus.create({
            id: 'scrollingScreenshot',
            parentId: 'screenshotMain',
            title: '自動滾動截圖',
            contexts: ['page']
        });

        // 區域截圖
        chrome.contextMenus.create({
            id: 'areaScreenshot',
            parentId: 'screenshotMain',
            title: '矩形區域截圖',
            contexts: ['page', 'selection', 'image']
        });

        console.log('[Screenshot V3] Context menus created');
    });
}

// 監聽右鍵菜單點擊
chrome.contextMenus.onClicked.addListener(async function(info, tab) {
    console.log('[Screenshot V3] Menu clicked:', info.menuItemId);

    let action = null;

    switch(info.menuItemId) {
        case 'normalScreenshot':
            action = 'normalScreenshot';
            break;
        case 'scrollingScreenshot':
            action = 'scrollingScreenshot';
            break;
        case 'areaScreenshot':
            action = 'areaScreenshot';
            break;
    }

    if (action && tab.id) {
        try {
            await chrome.tabs.sendMessage(tab.id, {action: action});
        } catch (error) {
            console.error('[Screenshot V3] Send message error:', error);
            // 嘗試注入content script
            await injectContentScript(tab.id);
            // 重試發送消息
            try {
                await chrome.tabs.sendMessage(tab.id, {action: action});
            } catch (retryError) {
                console.error('[Screenshot V3] Retry failed:', retryError);
            }
        }
    }
});

// 注入content script (V3方式)
async function injectContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ['content.js']
        });
        console.log('[Screenshot V3] Content script injected');
    } catch (error) {
        console.error('[Screenshot V3] Inject error:', error);
    }
}

// 監聽來自content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('[Screenshot V3] Message received:', request.action);

    // 使用async函數處理
    handleMessage(request, sender, sendResponse);

    // 返回true表示將異步發送響應
    return true;
});

// 處理消息
async function handleMessage(request, sender, sendResponse) {
    try {
        if (request.action === 'saveScreenshot') {
            const result = await saveScreenshot(request.dataUrl, request.type);
            sendResponse(result);
        }
        else if (request.action === 'captureTab') {
            const dataUrl = await captureVisibleTab(sender.tab.id);
            sendResponse({success: !!dataUrl, dataUrl: dataUrl});
        }
        else {
            sendResponse({success: false, error: 'unknown action'});
        }
    } catch (error) {
        console.error('[Screenshot V3] Handle message error:', error);
        sendResponse({success: false, error: error.message});
    }
}

// 捕獲可見標籤頁 (V3版本)
async function captureVisibleTab(tabId) {
    try {
        // V3中使用chrome.tabs.captureVisibleTab
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
        });

        console.log('[Screenshot V3] Capture successful, size:', dataUrl.length);
        return dataUrl;
    } catch (error) {
        console.error('[Screenshot V3] Capture error:', error);
        return null;
    }
}

// 保存截圖
async function saveScreenshot(dataUrl, type) {
    try {
        const result = await chrome.storage.local.get('screenshotSettings');
        const settings = result.screenshotSettings || {
            autoSave: true,
            savePath: 'Screenshots',
            filenameRule: 'screenshot_####',
            counter: 1
        };

        // 生成檔名
        const filename = generateFilename(settings);

        // 保存到歷史記錄
        await saveToHistory(dataUrl, filename, type);

        // 自動下載
        if (settings.autoSave) {
            const downloadId = await downloadScreenshot(dataUrl, filename);
            console.log('[Screenshot V3] Download started:', downloadId);
        }

        // 更新計數器
        settings.counter++;
        await chrome.storage.local.set({screenshotSettings: settings});

        return {success: true, filename: filename};
    } catch (error) {
        console.error('[Screenshot V3] Save error:', error);
        return {success: false, error: error.message};
    }
}

// 生成檔名
function generateFilename(settings) {
    const now = new Date();
    const timestamp = now.getTime();
    const counter = settings.counter;

    // 格式化日期時間
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // 替換規則中的佔位符
    let filename = settings.filenameRule
        .replace(/####/g, String(counter).padStart(4, '0'))
        .replace(/%timestamp%/g, timestamp)
        .replace(/%date%/g, year + month + day)
        .replace(/%time%/g, hours + minutes + seconds)
        .replace(/%year%/g, year)
        .replace(/%month%/g, month)
        .replace(/%day%/g, day);

    // 添加副檔名
    if (!filename.match(/\.(png|jpg|jpeg)$/i)) {
        filename += '.png';
    }

    // 添加路徑前綴
    if (settings.savePath && settings.savePath !== '') {
        filename = settings.savePath + '/' + filename;
    }

    return filename;
}

// 保存到歷史記錄
async function saveToHistory(dataUrl, filename, type) {
    try {
        const result = await chrome.storage.local.get('screenshotHistory');
        let history = result.screenshotHistory || [];

        // 添加新記錄
        history.unshift({
            timestamp: Date.now(),
            dataUrl: dataUrl,
            filename: filename,
            type: type
        });

        // 限制最多100條記錄
        if (history.length > 100) {
            history = history.slice(0, 100);
        }

        await chrome.storage.local.set({screenshotHistory: history});
        console.log('[Screenshot V3] History saved, total:', history.length);
    } catch (error) {
        console.error('[Screenshot V3] Save history error:', error);
    }
}

// 下載截圖 (V3版本)
async function downloadScreenshot(dataUrl, filename) {
    try {
        const downloadId = await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            conflictAction: 'uniquify',
            saveAs: false
        });

        return downloadId;
    } catch (error) {
        console.error('[Screenshot V3] Download error:', error);
        return null;
    }
}

// Service Worker保持活躍 (可選)
// V3的Service Worker會在不活動時自動休眠
// 如需保持活躍可以使用以下方法

// 監聽標籤頁更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        console.log('[Screenshot V3] Tab loaded:', tabId);
    }
});

// 監聽擴展圖標點擊 (action API)
chrome.action.onClicked.addListener(function(tab) {
    console.log('[Screenshot V3] Action clicked');
    // 如果需要在點擊圖標時執行操作
});