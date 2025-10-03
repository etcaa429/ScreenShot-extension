// 等待文檔加載完成
document.addEventListener('DOMContentLoaded', function() {
    // 獲取表單元素
    var autoSaveCheckbox = document.getElementById('autoSave');
    var savePathInput = document.getElementById('savePath');
    var filenameRuleInput = document.getElementById('filenameRule');
    var counterInput = document.getElementById('counter');
    var saveSettingsBtn = document.getElementById('saveSettings');
    var resetSettingsBtn = document.getElementById('resetSettings');
    var statusMessage = document.getElementById('statusMessage');
    
    // 加載現有設置
    loadSettings();
    
    // 保存設置按鈕點擊事件
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // 重置設置按鈕點擊事件
    resetSettingsBtn.addEventListener('click', function() {
        if (confirm('確定要重置為默認設置嗎？')) {
            resetToDefaultSettings();
        }
    });
    
    // 加載設置
    function loadSettings() {
        chrome.storage.local.get('screenshotSettings', function(result) {
            var settings = result.screenshotSettings || getDefaultSettings();
            
            autoSaveCheckbox.checked = settings.autoSave;
            savePathInput.value = settings.savePath;
            filenameRuleInput.value = settings.filenameRule;
            counterInput.value = settings.counter;
        });
    }
    
    // 保存設置
    function saveSettings() {
        var settings = {
            autoSave: autoSaveCheckbox.checked,
            savePath: savePathInput.value.trim(),
            filenameRule: filenameRuleInput.value.trim(),
            counter: parseInt(counterInput.value) || 1
        };
        
        // 驗證設置
        if (!settings.savePath) {
            showStatus('請輸入存儲路徑', 'error');
            return;
        }
        
        if (!settings.filenameRule) {
            showStatus('請輸入檔名規則', 'error');
            return;
        }
        
        // 保存到存儲
        chrome.storage.local.set({screenshotSettings: settings}, function() {
            showStatus('設置已保存成功', 'success');
        });
    }
    
    // 重置為默認設置
    function resetToDefaultSettings() {
        var defaultSettings = getDefaultSettings();
        
        autoSaveCheckbox.checked = defaultSettings.autoSave;
        savePathInput.value = defaultSettings.savePath;
        filenameRuleInput.value = defaultSettings.filenameRule;
        counterInput.value = defaultSettings.counter;
        
        chrome.storage.local.set({screenshotSettings: defaultSettings}, function() {
            showStatus('已重置為默認設置', 'success');
        });
    }
    
    // 獲取默認設置
    function getDefaultSettings() {
        return {
            autoSave: true,
            savePath: '%user%/Pictures',
            filenameRule: 'screenshot_####',
            counter: 1
        };
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
});