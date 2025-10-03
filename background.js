// 背景頁腳本
chrome.runtime.onInstalled.addListener(function() {
    console.log('Screenshot 插件已安裝');
    
    // 初始化設置
    chrome.storage.local.get(['screenshotSettings', 'screenshotHistory'], function(result) {
        if (!result.screenshotSettings) {
            var defaultSettings = {
                autoSave: true,
                savePath: '%user%/Pictures',
                filenameRule: 'screenshot_####',
                counter: 1
            };
            chrome.storage.local.set({screenshotSettings: defaultSettings});
        }
        
        if (!result.screenshotHistory) {
            chrome.storage.local.set({screenshotHistory: []});
        }
    });
    
    // 創建右鍵菜單
    createContextMenus();
});

// 創建右鍵菜單
function createContextMenus() {
    // 移除現有的菜單
    chrome.contextMenus.removeAll(function() {
        // 創建主菜單
        chrome.contextMenus.create({
            id: 'screenshotMain',
            title: '截圖工具',
            contexts: ['page', 'selection', 'image']
        });
        
        // 單頁截圖
        chrome.contextMenus.create({
            id: 'normalScreenshot',
            parentId: 'screenshotMain',
            title: '單頁截圖',
            contexts: ['page']
        });
        
        // 自動滾動截圖
        chrome.contextMenus.create({
            id: 'scrollingScreenshot',
            parentId: 'screenshotMain',
            title: '自動滾動截圖',
            contexts: ['page']
        });
        
        // 矩形區域截圖
        chrome.contextMenus.create({
            id: 'areaScreenshot',
            parentId: 'screenshotMain',
            title: '矩形區域截圖',
            contexts: ['page', 'selection', 'image']
        });
        
        // 矩形區域自動滾動截圖
        chrome.contextMenus.create({
            id: 'areaScrollingScreenshot',
            parentId: 'screenshotMain',
            title: '矩形區域自動滾動截圖',
            contexts: ['page']
        });
    });
}

// 監聽右鍵菜單點擊事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    switch(info.menuItemId) {
        case 'normalScreenshot':
            chrome.tabs.sendMessage(tab.id, {action: 'normalScreenshot'});
            break;
        case 'scrollingScreenshot':
            chrome.tabs.sendMessage(tab.id, {action: 'scrollingScreenshot'});
            break;
        case 'areaScreenshot':
            chrome.tabs.sendMessage(tab.id, {action: 'areaScreenshot'});
            break;
        case 'areaScrollingScreenshot':
            chrome.tabs.sendMessage(tab.id, {action: 'areaScrollingScreenshot'});
            break;
    }
});

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'saveScreenshot') {
        saveScreenshot(request.dataUrl, request.type, sendResponse);
        return true; // 表示將異步回調
    }
});

// 保存截圖
function saveScreenshot(dataUrl, type, callback) {
    chrome.storage.local.get('screenshotSettings', function(result) {
        var settings = result.screenshotSettings || {
            autoSave: true,
            savePath: '%user%/Pictures',
            filenameRule: 'screenshot_####',
            counter: 1
        };
        
        // 生成檔名
        var filename = generateFilename(settings);
        
        // 保存到歷史記錄
        saveToHistory(dataUrl, filename, type);
        
        // 如果開啟自動保存，則下載圖片
        if (settings.autoSave) {
            downloadScreenshot(dataUrl, filename);
        }
        
        // 更新計數器
        settings.counter++;
        chrome.storage.local.set({screenshotSettings: settings});
        
        callback({success: true, filename: filename});
    });
}

// 生成檔名
function generateFilename(settings) {
    var timestamp = new Date().getTime();
    var counter = settings.counter;
    
    // 替換 #### 為數字
    var filename = settings.filenameRule.replace(/####/g, counter.toString().padStart(4, '0'));
    
    // 替換時間戳
    filename = filename.replace(/%timestamp%/g, timestamp);
    
    // 添加副檔名
    if (!filename.endsWith('.png')) {
        filename += '.png';
    }
    
    return filename;
}

// 保存到歷史記錄
function saveToHistory(dataUrl, filename, type) {
    chrome.storage.local.get('screenshotHistory', function(result) {
        var history = result.screenshotHistory || [];
        
        // 添加新的截圖記錄
        history.unshift({
            timestamp: Date.now(),
            dataUrl: dataUrl,
            filename: filename,
            type: type
        });
        
        // 限制歷史記錄數量（最多100條）
        if (history.length > 100) {
            history = history.slice(0, 100);
        }
        
        chrome.storage.local.set({screenshotHistory: history});
    });
}

// 下載截圖
function downloadScreenshot(dataUrl, filename) {
    chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        conflictAction: 'uniquify',
        saveAs: false
    }, function(downloadId) {
        if (chrome.runtime.lastError) {
            console.error('下載失敗:', chrome.runtime.lastError);
        }
    });
}