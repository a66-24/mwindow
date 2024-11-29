import FingerprintService from "./fingerprint-service.js";
import ToastService from "./toast-service.js";

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      windows: [],
      maxWindowsPerRow: 5,
      iframeSandbox: "allow-scripts allow-popups allow-forms",
      isLoading: false,
      settings: {
        defaultUrl: "https://example.com",
        deviceStrategy: "random",
        autoSaveInterval: 30,
      },
      autoSaveTimer: null,
      settingsModal: null,
      globalUrl: "",
      showBackToTop: false,
      lastScrollTop: 0,
    };
  },
  methods: {
    async createNewWindow() {
      try {
        const isMobile = window.innerWidth <= 767;

        this.isLoading = true;
        const deviceProfile = await FingerprintService.generateDeviceProfile();

        const newWindow = {
          id: Date.now(),
          ...deviceProfile,
          url: this.settings.defaultUrl,
          isLoading: false,
          error: null,
          width: isMobile ? "100%" : "20%",
        };

        this.windows.push(newWindow);
        this.saveToLocalStorage();

        // 在手机端，确保新创建的窗口可见
        if (isMobile) {
          this.$nextTick(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
          });
        }

        ToastService.show("新窗口创建成功", "success");
      } catch (error) {
        ToastService.show(error.message, "error");
      } finally {
        this.isLoading = false;
      }
    },

    // 添加一个新的辅助方法来检查是否为移动设备
    isMobileDevice() {
      return window.innerWidth <= 767;
    },

    async navigateTo(index) {
      const window = this.windows[index];
      try {
        if (!window.url) {
          throw new Error("输入有效的URL");
        }

        window.isLoading = true;
        window.error = null;

        // 验证和格式化URL
        let url = window.url;
        if (!url.startsWith("http")) {
          url = "https://" + url;
        }

        // 验证URL是否有效
        const urlPattern =
          /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        if (!urlPattern.test(url)) {
          throw new Error("无效的URL格式");
        }

        // 自动登录逻辑（如果需要）
        // 例如：通过POST请求发送登录信息

        window.url = url;
        this.saveToLocalStorage();
      } catch (error) {
        let errorMessage = "未知错误";
        if (error instanceof TypeError) {
          errorMessage = "URL格式错误";
        } else if (error instanceof NetworkError) {
          errorMessage = "网络连接失败";
        }
        window.error = errorMessage;
        ToastService.show(errorMessage, "error");
      } finally {
        window.isLoading = false;
      }
    },

    closeWindow(index) {
      const window = this.windows[index];
      this.windows.splice(index, 1);
      this.saveToLocalStorage();
      ToastService.show("窗口已关闭", "info");
    },

    closeAllWindows() {
      if (this.windows.length === 0) {
        ToastService.show("没有可关闭的窗口", "info");
        return;
      }

      this.windows = [];
      this.saveToLocalStorage();
      ToastService.show("所有窗口已关闭", "success");
    },

    saveToLocalStorage() {
      localStorage.setItem("windows-settings", JSON.stringify(this.settings));
      localStorage.setItem("windows-data", JSON.stringify(this.windows));
    },
    loadFromLocalStorage() {
      const savedWindows = localStorage.getItem("windows-data");
      if (savedWindows) {
        this.windows = JSON.parse(savedWindows);
      }
    },
    showToast(message, type = "info") {
      // 简单的消息提示实现
      alert(message);
    },

    showSettings() {
      this.settingsModal.show();
    },

    saveSettings() {
      localStorage.setItem("windows-settings", JSON.stringify(this.settings));
      this.settingsModal.hide();
      this.setupAutoSave();
      ToastService.show("设置已保存", "success");
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
      const deviceProfile = await FingerprintService.generateDeviceProfile(
        this.settings.deviceStrategy,
      );
      Object.assign(window, deviceProfile);
      this.saveToLocalStorage();
      ToastService.show("设备纹已更新", "success");
    },

    handleIframeError(index) {
      const window = this.windows[index];
      window.error = "页面加载失败，请检查URL或网络连接";
      window.isLoading = false;
      ToastService.show(window.error, "error");
    },

    exportConfig() {
      const config = {
        windows: this.windows,
        settings: this.settings,
      };
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "matrix-config.json";
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
        ToastService.show("配置导入成功", "success");
      } catch (error) {
        ToastService.show("置导入失败：" + error.message, "error");
      }
    },

    async copyUrl(index) {
      const window = this.windows[index];
      try {
        await navigator.clipboard.writeText(window.url);
        ToastService.show("URL已复制到剪贴板", "success");
      } catch (error) {
        ToastService.show("复制失败：" + error.message, "error");
      }
    },

    reloadWindow(index) {
      const window = this.windows[index];
      const iframe = document.querySelectorAll(".window-iframe")[index];
      if (iframe) {
        window.isLoading = true;
        window.error = null;
        iframe.src = window.url;
      }
    },

    setupKeyboardShortcuts() {
      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key) {
            case "n":
              e.preventDefault();
              this.createNewWindow();
              break;
            case "w":
              e.preventDefault();
              if (this.windows.length > 0) {
                this.closeWindow(this.windows.length - 1);
              }
              break;
            case "s":
              e.preventDefault();
              this.showSettings();
              break;
          }
        }
      });
    },

    setupDragAndDrop() {
      const container = document.querySelector(".window-container");
      let draggedItem = null;

      container.addEventListener("dragstart", (e) => {
        draggedItem = e.target;
        e.target.style.opacity = "0.5";
      });

      container.addEventListener("dragend", (e) => {
        e.target.style.opacity = "1";
      });

      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector(".dragging");
        if (afterElement == null) {
          container.appendChild(draggable);
        } else {
          container.insertBefore(draggable, afterElement);
        }
      });
    },

    batchOperation(operation) {
      switch (operation) {
        case "refresh-all":
          this.windows.forEach((_, index) => this.refreshFingerprint(index));
          ToastService.show("已刷新所有设备指纹", "success");
          break;
        case "reload-all":
          this.windows.forEach((_, index) => this.reloadWindow(index));
          ToastService.show("已刷新所有窗口", "success");
          break;
      }
    },

    navigateAll() {
      if (!this.globalUrl) {
        ToastService.show("请输入有效的URL", "error");
        return;
      }

      const urlPattern =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (!urlPattern.test(this.globalUrl)) {
        ToastService.show("无效的URL格", "error");
        return;
      }

      const formattedUrl = this.globalUrl.startsWith("http")
        ? this.globalUrl
        : "https://" + this.globalUrl;

      this.windows.forEach((window) => {
        window.url = formattedUrl;
      });

      this.saveToLocalStorage();
      ToastService.show("所有窗口已导航到新网址", "success");
    },

    // 切换URL输入框的显示/隐藏
    toggleUrlInput(index) {
      const footer = document.getElementById(`footer-${index}`);
      if (footer) {
        const isVisible = footer.style.display === "block";
        footer.style.display = isVisible ? "none" : "block";
        if (!isVisible) {
          // 显示输入框时自动聚焦
          setTimeout(() => {
            const input = footer.querySelector("input");
            if (input) {
              input.focus();
              input.select(); // 选中所有文本
            }
          }, 100);
        }
      }
    },

    // 回到顶部
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },

    // 监听滚动以显示/隐藏回到顶部按钮
    handleScroll() {
      this.showBackToTop = window.scrollY > 200;

      if (window.innerWidth <= 767) {
        const currentScroll = window.scrollY;
        const navbar = document.querySelector('.navbar');
        
        if (currentScroll > this.lastScrollTop && currentScroll > 80) {
          navbar.classList.add('navbar-hidden');
        } else {
          navbar.classList.remove('navbar-hidden');
        }
        
        this.lastScrollTop = currentScroll;
      }
    },

    // 滚动iframe到顶部
    scrollIframeToTop(index) {
      const iframe = document.querySelectorAll(".window-iframe")[index];
      if (iframe) {
        try {
          // 尝试滚动iframe内容
          iframe.contentWindow.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } catch (error) {
          // 如果因为跨域无法访问iframe内容，至少滚动iframe元素本身
          iframe.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }
    },
  },
  watch: {
    windows: {
      deep: true,
      handler(newVal) {
        this.saveToLocalStorage();
      },
    },
  },
  mounted() {
    // 初始化设置
    const savedSettings = localStorage.getItem("windows-settings");
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    // 初始化模态框
    this.settingsModal = new bootstrap.Modal(
      document.getElementById("settingsModal"),
    );

    // 加载保存的窗口
    this.loadFromLocalStorage();

    // 如果没有窗口，创建一个新窗口
    if (this.windows.length === 0) {
      this.createNewWindow();
    }

    // 设置自动保存
    this.setupAutoSave();
    this.setupKeyboardShortcuts();
    this.setupDragAndDrop();

    // 添加滚动监听
    window.addEventListener("scroll", this.handleScroll);

    // 初始化所有窗口的 URL 输入框为隐藏状态
    this.$nextTick(() => {
      this.windows.forEach((_, index) => {
        const footer = document.getElementById(`footer-${index}`);
        if (footer) {
          footer.style.display = "none";
        }
      });
    });

    this.lastScrollTop = window.scrollY;
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    window.removeEventListener("scroll", this.handleScroll);
  },
}).mount("#app");
