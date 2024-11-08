import FingerprintService from './fingerprint-service.js';
import ToastService from './toast-service.js';

const { createApp } = Vue

const app = createApp({
    data() {
        return {
            windows: [],
            maxWindowsPerRow: 5,
            iframeSandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
            isLoading: false,
            settings: {
                defaultUrl: 'https://example.com',
                deviceStrategy: 'random',
                autoSaveInterval: 30,
            },
            autoSaveTimer: null,
            settingsModal: null,
            globalUrl: ''
        }
    },
    methods: {
        async createNewWindow() {
            try {
                const isMobile = window.innerWidth <= 767;
                
                // 手机端不限制窗口数量，直接创建新窗口
                if (!isMobile && this.windows.length >= this.maxWindowsPerRow * 3) {
                    throw new Error('已达到最大窗口数限制！');
                }

                this.isLoading = true;
                const deviceProfile = await FingerprintService.generateDeviceProfile();
                
                const newWindow = {
                    id: Date.now(),
                    ...deviceProfile,
                    url: this.settings.defaultUrl,
                    isLoading: false,
                    error: null
                };
                
                this.windows.push(newWindow);
                this.saveToLocalStorage();
                ToastService.show('新窗口创建成功', 'success');

                // 在手机端，确保新创建的窗口可见
                if (isMobile) {
                    this.$nextTick(() => {
                        const newWindowElement = document.querySelector('.browser-window:last-child');
                        if (newWindowElement) {
                            newWindowElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                }
            } catch (error) {
                ToastService.show(error.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async navigateTo(index) {
            const window = this.windows[index];
            try {
                if (!window.url) {
                    throw new Error('输入有效的URL');
                }

                window.isLoading = true;
                window.error = null;

                // 验证和格式化URL
                let url = window.url;
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }

                // 验证URL是否有效
                const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
                if (!urlPattern.test(url)) {
                    throw new Error('无效的URL格式');
                }

                // 自动登录逻辑（如果需要）
                // 例如：通过POST请求发送登录信息

                window.url = url;
                this.saveToLocalStorage();
            } catch (error) {
                window.error = error.message;
                ToastService.show(error.message, 'error');
            } finally {
                window.isLoading = false;
            }
        },

        closeWindow(index) {
            const window = this.windows[index];
            this.windows.splice(index, 1);
            this.saveToLocalStorage();
            ToastService.show('窗口已关闭', 'info');
        },

        closeAllWindows() {
            if (this.windows.length === 0) {
                ToastService.show('没有可关闭的窗口', 'info');
                return;
            }
            
            this.windows = [];
            this.saveToLocalStorage();
            ToastService.show('所有窗口已关闭', 'success');
        },

        generateUserAgent() {
            const devices = [
                'iPhone; CPU iPhone OS 14_0 like Mac OS X',
                'iPhone; CPU iPhone OS 15_0 like Mac OS X',
                'Android 10; Mobile',
                'Android 11; Mobile',
                'Android 12; Mobile'
            ];
            return `Mozilla/5.0 (${devices[Math.floor(Math.random() * devices.length)]})`;
        },
        generateFingerprint() {
            const rand = () => Math.random().toString(36).substr(2, 9);
            return `${rand()}_${rand()}`;
        },
        saveToLocalStorage() {
            localStorage.setItem('matrix-windows', JSON.stringify(this.windows));
        },
        loadFromLocalStorage() {
            const saved = localStorage.getItem('matrix-windows');
            if (saved) {
                this.windows = JSON.parse(saved);
            }
        },
        showToast(message, type = 'info') {
            // 简单的消息提示实现
            alert(message);
        },

        showSettings() {
            this.settingsModal.show();
        },

        saveSettings() {
            localStorage.setItem('matrix-settings', JSON.stringify(this.settings));
            this.settingsModal.hide();
            this.setupAutoSave();
            ToastService.show('设置已保存', 'success');
        },

        setupAutoSave() {
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }
            this.autoSaveTimer = setInterval(() => {
                this.saveToLocalStorage();
            }, this.settings.autoSaveInterval * 1000);
        },

        async refreshFingerprint(index) {
            const window = this.windows[index];
            const deviceProfile = await FingerprintService.generateDeviceProfile(this.settings.deviceStrategy);
            Object.assign(window, deviceProfile);
            this.saveToLocalStorage();
            ToastService.show('设备���纹已更新', 'success');
        },

        handleIframeError(index) {
            const window = this.windows[index];
            window.error = '页面加载失败，请检查URL或网络连接';
            window.isLoading = false;
            ToastService.show(window.error, 'error');
        },

        exportConfig() {
            const config = {
                windows: this.windows,
                settings: this.settings
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'matrix-config.json';
            a.click();
            URL.revokeObjectURL(url);
        },

        async importConfig(event) {
            try {
                const file = event.target.files[0];
                if (!file) return;

                const text = await file.text();
                const config = JSON.parse(text);
                
                this.windows = config.windows || [];
                this.settings = { ...this.settings, ...config.settings };
                
                this.saveToLocalStorage();
                this.saveSettings();
                ToastService.show('配置导入��功', 'success');
            } catch (error) {
                ToastService.show('配置导入失败：' + error.message, 'error');
            }
        },

        async copyUrl(index) {
            const window = this.windows[index];
            try {
                await navigator.clipboard.writeText(window.url);
                ToastService.show('URL已复制到剪贴板', 'success');
            } catch (error) {
                ToastService.show('复制失败：' + error.message, 'error');
            }
        },

        reloadWindow(index) {
            const window = this.windows[index];
            const iframe = document.querySelectorAll('.window-iframe')[index];
            if (iframe) {
                window.isLoading = true;
                window.error = null;
                iframe.src = window.url;
            }
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key) {
                        case 'n':
                            e.preventDefault();
                            this.createNewWindow();
                            break;
                        case 'w':
                            e.preventDefault();
                            if (this.windows.length > 0) {
                                this.closeWindow(this.windows.length - 1);
                            }
                            break;
                        case 's':
                            e.preventDefault();
                            this.showSettings();
                            break;
                    }
                }
            });
        },

        setupDragAndDrop() {
            const container = document.querySelector('.window-container');
            let draggedItem = null;

            container.addEventListener('dragstart', (e) => {
                draggedItem = e.target;
                e.target.style.opacity = '0.5';
            });

            container.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(container, e.clientY);
                const draggable = document.querySelector('.dragging');
                if (afterElement == null) {
                    container.appendChild(draggable);
                } else {
                    container.insertBefore(draggable, afterElement);
                }
            });
        },

        batchOperation(operation) {
            switch(operation) {
                case 'refresh-all':
                    this.windows.forEach((_, index) => this.refreshFingerprint(index));
                    ToastService.show('已刷新所有设备指纹', 'success');
                    break;
                case 'reload-all':
                    this.windows.forEach((_, index) => this.reloadWindow(index));
                    ToastService.show('已刷新所有窗口', 'success');
                    break;
            }
        },

        navigateAll() {
            if (!this.globalUrl) {
                ToastService.show('请输入有效的URL', 'error');
                return;
            }

            const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
            if (!urlPattern.test(this.globalUrl)) {
                ToastService.show('无效的URL格式', 'error');
                return;
            }

            const formattedUrl = this.globalUrl.startsWith('http') ? this.globalUrl : 'https://' + this.globalUrl;

            this.windows.forEach(window => {
                window.url = formattedUrl;
            });

            this.saveToLocalStorage();
            ToastService.show('所有窗口已导航到新网址', 'success');
        }
    },
    watch: {
        windows: {
            deep: true,
            handler(newVal) {
                this.saveToLocalStorage();
            }
        }
    },
    mounted() {
        // 初始化设置
        const savedSettings = localStorage.getItem('matrix-settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }

        // 初始化模态框
        this.settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
        
        // 加载保存的窗口
        this.loadFromLocalStorage();
        if (this.windows.length === 0) {
            this.createNewWindow();
        }

        // 设置自动保存
        this.setupAutoSave();
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
    },
    beforeUnmount() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
    }
}).mount('#app') 