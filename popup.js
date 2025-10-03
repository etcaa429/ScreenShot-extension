// 等待文檔加載完成
document.addEventListener('DOMContentLoaded', function() {
    // 獲取按鈕元素
    var normalScreenshotBtn = document.getElementById('normalScreenshot');
    var scrollingScreenshotBtn = document.getElementById('scrollingScreenshot');
    var viewHistoryBtn = document.getElementById('viewHistory');
    var openSettingsBtn = document.getElementById('openSettings');
    var statusMessage = document.getElementById('statusMessage');
    
    // 普通截圖按鈕點擊事件
    normalScreenshotBtn.addEventListener('click', function() {
        showLoading(this);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'normalScreenshot'}, function(response) {
                hideLoading(normalScreenshotBtn);
                if (response && response.success) {
                    showStatus('截圖成功！', 'success');
                } else {
                    showStatus('截圖失敗，請重試。', 'error');
                }
            });
        });
    });
    
    // 滾動截圖按鈕點擊事件
    scrollingScreenshotBtn.addEventListener('click', function() {
        showLoading(this);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'scrollingScreenshot'}, function(response) {
                hideLoading(scrollingScreenshotBtn);
                if (response && response.success) {
                    showStatus('滾動截圖開始，按左鍵停止。', 'success');
                } else {
                    showStatus('滾動截圖失敗，請重試。', 'error');
                }
            });
        });
    });
    
    // 查看歷史按鈕點擊事件
    viewHistoryBtn.addEventListener('click', function() {
        showLoading(this);
        chrome.storage.local.get('screenshotHistory', function(result) {
            hideLoading(viewHistoryBtn);
            var history = result.screenshotHistory || [];
            if (history.length === 0) {
                showStatus('沒有截圖歷史記錄。', 'success');
            } else {
                // 創建歷史記錄對話框
                createHistoryDialog(history);
            }
        });
    });
    
    // 打開設置按鈕點擊事件
    openSettingsBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
    
    // 顯示加載狀態
    function showLoading(button) {
        button.classList.add('loading');
    }
    
    // 隱藏加載狀態
    function hideLoading(button) {
        button.classList.remove('loading');
    }
    
    // 顯示狀態消息
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status ' + type;
        
        // 3秒後隱藏消息
        setTimeout(function() {
            statusMessage.className = 'status';
        }, 3000);
    }
    
    // 創建歷史記錄對話框
    function createHistoryDialog(history) {
        // 創建對話框容器
        var dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        
        // 創建對話框內容
        var dialogContent = document.createElement('div');
        dialogContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        `;
        
        // 對話框標題
        var title = document.createElement('h2');
        title.textContent = '截圖歷史記錄';
        title.style.cssText = 'margin-top: 0; color: #2c3e50;';
        
        // 關閉按鈕
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '關閉';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
        `;
        
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(dialog);
        });
        
        // 歷史記錄列表
        var historyList = document.createElement('div');
        historyList.style.cssText = 'margin-top: 20px;';
        
        // 添加每條歷史記錄
        history.forEach(function(item, index) {
            var historyItem = document.createElement('div');
            historyItem.style.cssText = `
                padding: 15px;
                border-bottom: 1px solid #f1f1f1;
                margin-bottom: 10px;
                position: relative;
            `;
            
            var itemTitle = document.createElement('h3');
            itemTitle.textContent = '截圖 ' + (index + 1);
            itemTitle.style.cssText = 'margin: 0 0 10px 0; color: #3498db;';
            
            var itemInfo = document.createElement('div');
            itemInfo.style.cssText = 'font-size: 12px; color: #7f8c8d; margin-bottom: 10px;';
            itemInfo.innerHTML = `
                <div>時間: ${new Date(item.timestamp).toLocaleString()}</div>
                <div>類型: ${item.type}</div>
                <div>檔名: ${item.filename}</div>
            `;
            
            var previewBtn = document.createElement('button');
            previewBtn.textContent = '預覽';
            previewBtn.style.cssText = `
                background: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
                margin-right: 5px;
            `;
            
            previewBtn.addEventListener('click', function() {
                previewScreenshot(item.dataUrl);
            });
            
            var downloadBtn = document.createElement('button');
            downloadBtn.textContent = '下載';
            downloadBtn.style.cssText = `
                background: #27ae60;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
                margin-right: 5px;
            `;
            
            downloadBtn.addEventListener('click', function() {
                downloadScreenshot(item.dataUrl, item.filename);
            });
            
            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = '刪除';
            deleteBtn.style.cssText = `
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
            `;
            
            deleteBtn.addEventListener('click', function() {
                if (confirm('確定要刪除這張截圖嗎？')) {
                    history.splice(index, 1);
                    chrome.storage.local.set({screenshotHistory: history}, function() {
                        document.body.removeChild(dialog);
                        createHistoryDialog(history);
                    });
                }
            });
            
            historyItem.appendChild(itemTitle);
            historyItem.appendChild(itemInfo);
            historyItem.appendChild(previewBtn);
            historyItem.appendChild(downloadBtn);
            historyItem.appendChild(deleteBtn);
            historyList.appendChild(historyItem);
        });
        
        // 清空歷史按鈕
        var clearBtn = document.createElement('button');
        clearBtn.textContent = '清空所有歷史記錄';
        clearBtn.style.cssText = `
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
        `;
        
        clearBtn.addEventListener('click', function() {
            if (confirm('確定要清空所有截圖歷史記錄嗎？')) {
                chrome.storage.local.set({screenshotHistory: []}, function() {
                    document.body.removeChild(dialog);
                    showStatus('歷史記錄已清空。', 'success');
                });
            }
        });
        
        dialogContent.appendChild(title);
        dialogContent.appendChild(closeBtn);
        dialogContent.appendChild(historyList);
        dialogContent.appendChild(clearBtn);
        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);
    }
    
    // 預覽截圖
    function previewScreenshot(dataUrl) {
        var previewDialog = document.createElement('div');
        previewDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;
        
        var img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border: 4px solid white;
            border-radius: 8px;
        `;
        
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '關閉';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(previewDialog);
        });
        
        previewDialog.appendChild(img);
        previewDialog.appendChild(closeBtn);
        document.body.appendChild(previewDialog);
    }
    
    // 下載截圖
    function downloadScreenshot(dataUrl, filename) {
        var link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatus('下載已開始。', 'success');
    }
});