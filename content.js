// content.js - 內容腳本，負責注入截圖功能到頁面

// 檢查是否已經注入過screenshot.js
if (!window.screenshotInjected) {
    window.screenshotInjected = true;
    
    // 動態加載screenshot.js
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL('screenshot.js');
    script.onload = function() {
        console.log('Screenshot script loaded successfully');
    };
    script.onerror = function() {
        console.error('Failed to load screenshot script');
    };
    
    document.head.appendChild(script);
}

// 中轉消息到注入的腳本
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // 使用window.postMessage將消息發送給注入的screenshot.js
    window.postMessage({
        type: 'SCREENSHOT_EXTENSION',
        request: request,
        sender: 'content_script'
    }, '*');
    
    // 監聽來自注入腳本的回應
    var responseHandler = function(event) {
        if (event.source === window && event.data.type === 'SCREENSHOT_EXTENSION_RESPONSE') {
            sendResponse(event.data.response);
            window.removeEventListener('message', responseHandler);
        }
    };
    
    window.addEventListener('message', responseHandler);
    
    // 告訴Chrome我們將異步回調
    return true;
});

// 監聽來自注入腳本的消息
window.addEventListener('message', function(event) {
    if (event.source === window && event.data.type === 'SCREENSHOT_EXTENSION_MESSAGE') {
        var message = event.data.message;
        
        // 將消息轉發到後台
        if (message.action === 'saveScreenshot') {
            chrome.runtime.sendMessage(message, function(response) {
                // 將後台的回應發送回注入腳本
                window.postMessage({
                    type: 'SCREENSHOT_EXTENSION_SAVE_RESPONSE',
                    response: response
                }, '*');
            });
        }
    }
});