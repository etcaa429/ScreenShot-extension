// popup.js - Manifest V3版本
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Screenshot V3] Popup loaded');

    // 獲取按鈕元素
    const normalScreenshotBtn = document.getElementById('normalScreenshot');
    const scrollingScreenshotBtn = document.getElementById('scrollingScreenshot');
    const viewHistoryBtn = document.getElementById('viewHistory');
    const openSettingsBtn = document.getElementById('openSettings');
    const statusMessage = document.getElementById('statusMessage');

    // 普通截圖按鈕
    normalScreenshotBtn.addEventListener('click', async function() {
        await executeScreenshotAction('normalScreenshot', this, '截圖');
    });

    // 滾動截圖按鈕
    scrollingScreenshotBtn.addEventListener('click', async function() {
        await executeScreenshotAction('scrollingScreenshot', this, '滾動截圖');
    });

    // 查看歷史按鈕
    viewHistoryBtn.addEventListener('click', async function() {
        showLoading(this);
        try {
            const result = await chrome.storage.local.get('screenshotHistory');
            hideLoading(viewHistoryBtn);

            const history = result.screenshotHistory || [];
            if (history.length === 0) {
                showStatus('沒有截圖歷史記錄。', 'success');
            } else {
                // 創建歷史記錄視窗
                createHistoryDialog(history);
            }
        } catch (error) {
            hideLoading(viewHistoryBtn);
            console.error('[Screenshot V3] View history error:', error);
            showStatus('讀取歷史失敗: ' + error.message, 'error');
        }
    });

    // 統一的截圖執行函數
    async function executeScreenshotAction(action, button, actionName) {
        showLoading(button);
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

            // 發送消息到content script
            const response = await chrome.tabs.sendMessage(tab.id, {action: action});

            hideLoading(button);

            if (response && response.success) {
                showStatus(`${actionName}已開始`, 'success');
                if (action === 'scrollingScreenshot') {
                    setTimeout(() => window.close(), 1000); // 延遲關閉讓用戶看到消息
                }
            } else {
                showStatus(`${actionName}失敗: ${response.error || '未知錯誤'}`, 'error');
            }
        } catch (error) {
            hideLoading(button);
            console.error(`[Screenshot V3] ${actionName} error:`, error);

            if (error.message.includes('Could not establish connection')) {
                showStatus('請刷新頁面後重試', 'error');
            } else {
                showStatus(`${actionName}失敗: ${error.message}`, 'error');
            }
        }
    }

    // 打開設置按鈕
    openSettingsBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // 顯示加載狀態
    function showLoading(button) {
        button.classList.add('loading');
        button.disabled = true;
    }

    // 隱藏加載狀態
    function hideLoading(button) {
        button.classList.remove('loading');
        button.disabled = false;
    }

    // 顯示狀態消息
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status ' + type;
        setTimeout(function() {
            statusMessage.className = 'status';
        }, 3000);
    }

    // 創建歷史記錄對話框
    function createHistoryDialog(history) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-height: 600px;
            overflow-y: auto;
            position: relative;
        `;

        const title = document.createElement('h2');
        title.textContent = '截圖歷史記錄';
        title.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
        `;
        closeBtn.addEventListener('click', () => document.body.removeChild(dialog));

        const list = document.createElement('div');

        history.forEach((item, index) => {
            const itemDiv = createHistoryItem(item, index, history, dialog);
            list.appendChild(itemDiv);
        });

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空所有歷史';
        clearBtn.style.cssText = `
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
            width: 100%;
            margin-top: 15px;
        `;
        clearBtn.addEventListener('click', async () => {
            if (confirm('確定要清空所有截圖歷史嗎?')) {
                await chrome.storage.local.set({screenshotHistory: []});
                document.body.removeChild(dialog);
                showStatus('歷史記錄已清空', 'success');
            }
        });

        content.appendChild(title);
        content.appendChild(closeBtn);
        content.appendChild(list);
        content.appendChild(clearBtn);
        dialog.appendChild(content);
        document.body.appendChild(dialog);
    }

    // 創建歷史項目
    function createHistoryItem(item, index, history, dialog) {
        const div = document.createElement('div');
        div.style.cssText = `
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            margin-bottom: 10px;
        `;

        const info = document.createElement('div');
        info.style.cssText = 'font-size: 12px; color: #7f8c8d; margin-bottom: 10px;';
        info.innerHTML = `
            <div><strong>時間:</strong> ${new Date(item.timestamp).toLocaleString('zh-TW')}</div>
            <div><strong>類型:</strong> ${item.type}</div>
            <div><strong>檔名:</strong> ${item.filename}</div>
        `;

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 5px;';

        const previewBtn = createButton('預覽', '#3498db', () => {
            previewScreenshot(item.dataUrl);
        });

        const downloadBtn = createButton('下載', '#27ae60', () => {
            downloadScreenshot(item.dataUrl, item.filename);
        });

        const deleteBtn = createButton('刪除', '#e74c3c', async () => {
            if (confirm('確定要刪除這張截圖嗎?')) {
                history.splice(index, 1);
                await chrome.storage.local.set({screenshotHistory: history});
                document.body.removeChild(dialog);
                createHistoryDialog(history);
            }
        });

        btnContainer.appendChild(previewBtn);
        btnContainer.appendChild(downloadBtn);
        btnContainer.appendChild(deleteBtn);

        div.appendChild(info);
        div.appendChild(btnContainer);

        return div;
    }

    // 創建按鈕
    function createButton(text, color, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: ${color};
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 15px;
            cursor: pointer;
            flex: 1;
        `;
        btn.addEventListener('click', onClick);
        return btn;
    }

    // 預覽截圖
    function previewScreenshot(dataUrl) {
        const preview = document.createElement('div');
        preview.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;

        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border: 2px solid white;
            border-radius: 4px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '關閉';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 16px;
        `;
        closeBtn.addEventListener('click', () => document.body.removeChild(preview));

        preview.addEventListener('click', (e) => {
            if (e.target === preview) {
                document.body.removeChild(preview);
            }
        });

        preview.appendChild(img);
        preview.appendChild(closeBtn);
        document.body.appendChild(preview);
    }

    // 下載截圖
    function downloadScreenshot(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatus('下載已開始', 'success');
    }
});