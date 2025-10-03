// screenshot.js - 瀏覽器插件內容腳本
var ScreenshotManager = function() {
    this.isScrolling = false;
    this.scrollInterval = null;
    this.screenshotParts = [];
    this.currentY = 0;
    this.totalHeight = 0;
    this.areaSelection = null;
};

// 普通截圖
ScreenshotManager.prototype.normalScreenshot = function() {
    var self = this;

    // 使用html2canvas進行實際截圖
    html2canvas(document.body, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: document.body.scrollWidth,
        height: document.body.scrollHeight
    }).then(function(canvas) {
        // 生成圖像數據
        var dataUrl = canvas.toDataURL('image/png');
        
        // 保存截圖
        self.saveScreenshot(dataUrl, '單頁截圖');
    }).catch(function(error) {
        console.error('截圖失敗:', error);
        // 發送錯誤消息到後台
        window.postMessage({
            type: 'SCREENSHOT_EXTENSION_ERROR',
            message: {
                error: '截圖失敗: ' + error.message
            }
        }, '*');
    });
};

// 滾動截圖
ScreenshotManager.prototype.scrollingScreenshot = function() {
    var self = this;

    if (self.isScrolling) {
        self.stopScrolling();
        return;
    }

    self.isScrolling = true;
    self.screenshotParts = [];
    self.currentY = 0;
    self.totalHeight = document.body.scrollHeight;

    // 顯示提示信息
    self.showScrollingMessage();

    // 開始滾動截圖
    self.captureScrollingPart();

    // 設置滾動間隔
    self.scrollInterval = setInterval(function() {
        self.currentY += window.innerHeight * 0.8;

        if (self.currentY >= self.totalHeight || !self.isScrolling) {
            self.stopScrolling();
            return;
        }

        window.scrollTo(0, self.currentY);
        setTimeout(function() {
            self.captureScrollingPart();
        }, 300);

    }, 1000);

    // 監聽鼠標左鍵點擊停止
    document.addEventListener('mousedown', self.onMouseDown.bind(self));
};

// 捕獲滾動部分
ScreenshotManager.prototype.captureScrollingPart = function() {
    var self = this;

    // 使用html2canvas捕獲當前視窗
    html2canvas(document.body, {
        x: 0,
        y: self.currentY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: document.body.scrollWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: self.currentY,
        useCORS: true,
        allowTaint: true
    }).then(function(canvas) {
        self.screenshotParts.push({
            canvas: canvas,
            y: self.currentY
        });
    }).catch(function(error) {
        console.error('滾動截圖部分失敗:', error);
    });
};

// 停止滾動
ScreenshotManager.prototype.stopScrolling = function() {
    var self = this;

    self.isScrolling = false;
    clearInterval(self.scrollInterval);
    document.removeEventListener('mousedown', self.onMouseDown.bind(self));

    // 隱藏提示信息
    self.hideScrollingMessage();

    if (self.screenshotParts.length > 0) {
        self.mergeScrollingScreenshots();
    }
};

// 合併滾動截圖
ScreenshotManager.prototype.mergeScrollingScreenshots = function() {
    var self = this;

    var mergedCanvas = document.createElement('canvas');
    var ctx = mergedCanvas.getContext('2d');

    mergedCanvas.width = window.innerWidth;
    mergedCanvas.height = self.totalHeight;

    // 填充背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

    // 合併所有部分
    self.screenshotParts.forEach(function(part) {
        var yOffset = part.y;
        ctx.drawImage(part.canvas, 0, yOffset);
    });

    // 生成最終圖像
    var dataUrl = mergedCanvas.toDataURL('image/png');
    self.saveScreenshot(dataUrl, '滾動截圖');
};

// 鼠標點擊事件處理
ScreenshotManager.prototype.onMouseDown = function(e) {
    if (e.button === 0) {
        this.stopScrolling();
    }
};

// 矩形區域截圖
ScreenshotManager.prototype.areaScreenshot = function() {
    var self = this;

    // 創建選擇覆蓋層
    var overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
        cursor: crosshair;
    `;

    var selection = document.createElement('div');
    selection.style.cssText = `
        position: absolute;
        border: 2px solid #3498db;
        background: rgba(52, 152, 219, 0.1);
        display: none;
    `;

    overlay.appendChild(selection);
    document.body.appendChild(overlay);

    var startX, startY;
    var isSelecting = false;

    // 鼠標按下事件
    overlay.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;

        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0';
        selection.style.height = '0';
        selection.style.display = 'block';
    });

    // 鼠標移動事件
    overlay.addEventListener('mousemove', function(e) {
        if (!isSelecting) return;

        var currentX = e.clientX;
        var currentY = e.clientY;

        // 計算選擇區域
        var x = Math.min(startX, currentX);
        var y = Math.min(startY, currentY);
        var width = Math.abs(currentX - startX);
        var height = Math.abs(currentY - startY);

        selection.style.left = x + 'px';
        selection.style.top = y + 'px';
        selection.style.width = width + 'px';
        selection.style.height = height + 'px';
    });

    // 鼠標釋放事件
    overlay.addEventListener('mouseup', function(e) {
        if (!isSelecting) return;

        isSelecting = false;
        var x = parseInt(selection.style.left);
        var y = parseInt(selection.style.top);
        var width = parseInt(selection.style.width);
        var height = parseInt(selection.style.height);

        // 移除覆蓋層
        document.body.removeChild(overlay);

        if (width > 0 && height > 0) {
            // 捕獲選擇區域
            self.captureArea(x, y, width, height, '矩形區域截圖');
        }
    });
};

// 捕獲指定區域
ScreenshotManager.prototype.captureArea = function(x, y, width, height, type) {
    var self = this;

    // 使用html2canvas截取整個頁面
    html2canvas(document.body, {
        x: x,
        y: y,
        width: width,
        height: height,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
    }).then(function(canvas) {
        // 如果canvas尺寸與選擇區域不符，調整尺寸
        if (canvas.width !== width || canvas.height !== height) {
            var tempCanvas = document.createElement('canvas');
            var ctx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = height;
            ctx.drawImage(canvas, 0, 0, width, height);
            canvas = tempCanvas;
        }

        var dataUrl = canvas.toDataURL('image/png');
        self.saveScreenshot(dataUrl, type);
    }).catch(function(error) {
        console.error('區域截圖失敗:', error);
        window.postMessage({
            type: 'SCREENSHOT_EXTENSION_ERROR',
            message: {
                error: '區域截圖失敗: ' + error.message
            }
        }, '*');
    });
};

// 矩形區域自動滾動截圖
ScreenshotManager.prototype.areaScrollingScreenshot = function() {
    var self = this;

    // 首先讓用戶選擇區域
    self.selectArea(function(area) {
        if (!area) return;

        self.areaSelection = area;
        self.startAreaScrolling();
    });
};

// 選擇區域
ScreenshotManager.prototype.selectArea = function(callback) {
    var self = this;

    var overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
        cursor: crosshair;
    `;

    var selection = document.createElement('div');
    selection.style.cssText = `
        position: absolute;
        border: 2px solid #27ae60;
        background: rgba(39, 174, 96, 0.1);
        display: none;
    `;

    overlay.appendChild(selection);
    document.body.appendChild(overlay);

    var startX, startY;
    var isSelecting = false;

    overlay.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;

        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0';
        selection.style.height = '0';
        selection.style.display = 'block';
    });

    overlay.addEventListener('mousemove', function(e) {
        if (!isSelecting) return;

        var currentX = e.clientX;
        var currentY = e.clientY;

        var x = Math.min(startX, currentX);
        var y = Math.min(startY, currentY);
        var width = Math.abs(currentX - startX);
        var height = Math.abs(currentY - startY);

        selection.style.left = x + 'px';
        selection.style.top = y + 'px';
        selection.style.width = width + 'px';
        selection.style.height = height + 'px';
    });

    overlay.addEventListener('mouseup', function(e) {
        if (!isSelecting) return;

        isSelecting = false;
        var x = parseInt(selection.style.left);
        var y = parseInt(selection.style.top);
        var width = parseInt(selection.style.width);
        var height = parseInt(selection.style.height);

        document.body.removeChild(overlay);

        if (width > 0 && height > 0) {
            callback({x: x, y: y, width: width, height: height});
        } else {
            callback(null);
        }
    });
};

// 開始區域滾動截圖
ScreenshotManager.prototype.startAreaScrolling = function() {
    var self = this;

    self.isScrolling = true;
    self.screenshotParts = [];
    self.currentY = 0;
    self.totalHeight = document.body.scrollHeight;

    self.showAreaScrollingMessage();
    self.captureAreaPart();

    self.scrollInterval = setInterval(function() {
        self.currentY += self.areaSelection.height * 0.8;

        if (self.currentY >= self.totalHeight || !self.isScrolling) {
            self.stopAreaScrolling();
            return;
        }

        window.scrollTo(0, self.currentY);
        setTimeout(function() {
            self.captureAreaPart();
        }, 300);

    }, 1000);

    document.addEventListener('mousedown', self.onAreaMouseDown.bind(self));
};

// 捕獲區域部分
ScreenshotManager.prototype.captureAreaPart = function() {
    var self = this;

    // 使用html2canvas捕獲指定區域
    html2canvas(document.body, {
        x: self.areaSelection.x,
        y: self.areaSelection.y + self.currentY,
        width: self.areaSelection.width,
        height: self.areaSelection.height,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: self.currentY
    }).then(function(canvas) {
        self.screenshotParts.push({
            canvas: canvas,
            y: self.currentY
        });
    }).catch(function(error) {
        console.error('區域滾動截圖部分失敗:', error);
    });
};

// 停止區域滾動
ScreenshotManager.prototype.stopAreaScrolling = function() {
    var self = this;

    self.isScrolling = false;
    clearInterval(self.scrollInterval);
    document.removeEventListener('mousedown', self.onAreaMouseDown.bind(self));

    self.hideAreaScrollingMessage();

    if (self.screenshotParts.length > 0) {
        self.mergeAreaScrollingScreenshots();
    }
};

// 合併區域滾動截圖
ScreenshotManager.prototype.mergeAreaScrollingScreenshots = function() {
    var self = this;

    var mergedCanvas = document.createElement('canvas');
    var ctx = mergedCanvas.getContext('2d');

    mergedCanvas.width = self.areaSelection.width;
    mergedCanvas.height = self.totalHeight;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

    self.screenshotParts.forEach(function(part) {
        var yOffset = part.y;
        ctx.drawImage(part.canvas, 0, yOffset);
    });

    var dataUrl = mergedCanvas.toDataURL('image/png');
    self.saveScreenshot(dataUrl, '矩形區域自動滾動截圖');
};

// 區域截圖鼠標事件
ScreenshotManager.prototype.onAreaMouseDown = function(e) {
    if (e.button === 0) {
        this.stopAreaScrolling();
    }
};

// 保存截圖 - 通過postMessage與content.js通信
ScreenshotManager.prototype.saveScreenshot = function(dataUrl, type) {
    // 發送消息到插件的其他部分
    window.postMessage({
        type: 'SCREENSHOT_EXTENSION_MESSAGE',
        message: {
            action: 'saveScreenshot',
            dataUrl: dataUrl,
            type: type
        }
    }, '*');
};

// 顯示滾動提示信息
ScreenshotManager.prototype.showScrollingMessage = function() {
    var message = document.createElement('div');
    message.id = 'scrollingMessage';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    message.textContent = '正在滾動截圖，點擊左鍵停止...';

    document.body.appendChild(message);
};

// 隱藏滾動提示信息
ScreenshotManager.prototype.hideScrollingMessage = function() {
    var message = document.getElementById('scrollingMessage');
    if (message) {
        document.body.removeChild(message);
    }
};

// 顯示區域滾動提示信息
ScreenshotManager.prototype.showAreaScrollingMessage = function() {
    var message = document.createElement('div');
    message.id = 'areaScrollingMessage';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(39, 174, 96, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    message.textContent = '正在區域滾動截圖，點擊左鍵停止...';

    document.body.appendChild(message);
};

// 隱藏區域滾動提示信息
ScreenshotManager.prototype.hideAreaScrollingMessage = function() {
    var message = document.getElementById('areaScrollingMessage');
    if (message) {
        document.body.removeChild(message);
    }
};

// 初始化截圖管理器
window.screenshotManager = new ScreenshotManager();
window.dispatchEvent(new Event('ScreenshotManagerReady'));
console.log('[Screenshot] Screenshot manager initialized');

// 監聽來自插件其他部分的消息
window.addEventListener('message', function(event) {
    if (event.source === window && event.data.type === 'SCREENSHOT_EXTENSION') {
        var request = event.data.request;
        var response = {success: true};

        switch(request.action) {
            case 'normalScreenshot':
                screenshotManager.normalScreenshot();
                break;
            case 'scrollingScreenshot':
                screenshotManager.scrollingScreenshot();
                break;
            case 'areaScreenshot':
                screenshotManager.areaScreenshot();
                break;
            case 'areaScrollingScreenshot':
                screenshotManager.areaScrollingScreenshot();
                break;
            default:
                response = {success: false, error: '未知操作'};
        }

        // 發送回應
        window.postMessage({
            type: 'SCREENSHOT_EXTENSION_RESPONSE',
            response: response
        }, '*');
    }
});