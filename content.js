// content.js - 修復版本
console.log('[Screenshot] Content script loaded');

// 檢查是否已經注入過screenshot.js
if (!window.screenshotInjected) {
    window.screenshotInjected = true;

    // 動態加載screenshot.js
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL('screenshot.js');
    script.onload = function() {
        console.log('[Screenshot] Screenshot script loaded successfully');
        this.remove();
    };
    script.onerror = function() {
        console.error('[Screenshot] Failed to load screenshot script');
    };

    document.head.appendChild(script);
}

let screenshotReady = false;

window.addEventListener('ScreenshotManagerReady', () => {
    console.log('[Screenshot] ScreenshotManagerReady event received');
    screenshotReady = true;
});

// 監聽來自popup/background的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('[Screenshot] Message received in content script:', request);

    // 直接處理消息，不通過window.postMessage中轉
    if (request.action === 'normalScreenshot' ||
        request.action === 'scrollingScreenshot' ||
        request.action === 'areaScreenshot' ||
        request.action === 'areaScrollingScreenshot') {

        waitForScreenshotManager(request.action, sendResponse);
        return true; // 保持消息通道開放
    } else {
        sendResponse({success: false, error: '未知操作'});
    }

    return true; // 保持消息通道開放
});

function waitForScreenshotManager(action, sendResponse, retries = 10, delay = 300) {
    if (window.screenshotManager && screenshotReady) {
        try {
            window.screenshotManager[action]();
            sendResponse({success: true, message: '截圖已開始'});
        } catch (error) {
            console.error('[Screenshot] Error executing screenshot:', error);
            sendResponse({success: false, error: error.message});
        }
    } else if (retries > 0) {
        setTimeout(() => {
            waitForScreenshotManager(action, sendResponse, retries - 1, delay);
        }, delay);
    } else {
        console.error('[Screenshot] screenshotManager not found after retries');
        sendResponse({success: false, error: '截圖管理器未初始化'});
    }
}

// 監聽來自注入腳本的消息（用於保存截圖）
window.addEventListener('message', function(event) {
    if (event.source === window && event.data.type === 'SCREENSHOT_EXTENSION_MESSAGE') {
        var message = event.data.message;
        console.log('[Screenshot] Received save request from injected script');

        if (message.action === 'saveScreenshot') {
            // 直接轉發到background.js
            chrome.runtime.sendMessage({
                action: 'saveScreenshot',
                dataUrl: message.dataUrl,
                type: message.type
            }, function(response) {
                console.log('[Screenshot] Save response:', response);
                // 可以將回應發送回注入腳本（如果需要）
                if (response && !response.success) {
                    console.error('[Screenshot] Save failed:', response.error);
                }
            });
        }
    }
});

// 監聽錯誤消息
window.addEventListener('message', function(event) {
    if (event.source === window && event.data.type === 'SCREENSHOT_EXTENSION_ERROR') {
        console.error('[Screenshot] Error from injected script:', event.data.message.error);
    }
});