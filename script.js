/**
 * 人生おかね診断 - JavaScript
 * 100点のUI/UX体験を提供する高品質なシミュレーションアプリケーション
 */

// ===== アプリケーション設定 =====
const APP_CONFIG = {
    VERSION: '3.0.0',
    STORAGE_KEY: 'lifetimeSimulatorData_v3',
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 4000,
    CALCULATION_DELAY: 1500,
    MAX_RETRIES: 3
};

// ===== アプリケーションデータ =====
const APP_DATA = {
    categories: [
        { id: "housing", name: "住居費", icon: "🏠", placeholder: "8.0", max: 50, description: "家賃、住宅ローン、管理費、固定資産税など" },
        { id: "food", name: "食費", icon: "🍽️", placeholder: "6.0", max: 20, description: "外食費、食材費、お弁当代など" },
        { id: "utilities", name: "水道光熱費", icon: "⚡", placeholder: "2.0", max: 10, description: "電気、ガス、水道の基本料金+使用料" },
        { id: "communication", name: "通信費", icon: "📱", placeholder: "1.0", max: 5, description: "携帯電話、インターネット、固定電話など" },
        { id: "insurance", name: "保険料", icon: "🛡️", placeholder: "1.5", max: 10, description: "生命保険、医療保険、火災保険など" },
        { id: "vehicle", name: "自動車関連費", icon: "🚗", placeholder: "3.0", max: 10, description: "ローン、駐車場代、保険、車検、ガソリン代など" },
        { id: "education", name: "教育・自己投資費", icon: "📚", placeholder: "1.0", max: 20, description: "自身の学習、子供の習い事（学費本体除く）など" },
        { id: "subscriptions", name: "サブスクリプション", icon: "📺", placeholder: "0.3", max: 5, description: "動画・音楽配信、アプリなど" },
        { id: "others", name: "その他固定費", icon: "📦", placeholder: "1.0", max: 10, description: "こづかい、趣味、定期購入、ペット費用など" }
    ],
    lifeEvents: [
        { id: 1, key: "marriage", text: "結婚予定はありますか？", description: "平均費用：約300万円（一時費用）", icon: "💍", cost: 300, isOneTime: true },
        { id: 2, key: "car", text: "車の購入予定はありますか？", description: "購入費用：10年ごとに約200-300万円 + 維持費：月3-5万円程度", icon: "🚗", cost: 250, recurringCostPerYear: 48, isOneTime: false, costInterval: 10 },
        { id: 3, key: "children", text: "出産・子育て予定はありますか？", description: "子育て費用：1人あたり約1500-2000万円（大学卒業まで）", icon: "👶", cost: 1800, hasDetail: true, detailSettingKey: 'childrenCountGroup' },
        { id: 4, key: "housing", text: "住宅購入予定はありますか？", description: "住宅費用：約3000-5000万円 + 固定資産税等", icon: "🏠", cost: 3500, hasDetail: true, detailSettingKey: 'housingAgeGroup', isOneTime: true },
        { id: 5, key: "caregiving", text: "親の介護費用の準備は必要ですか？", description: "介護費用：一時金 約100万円、月額 約8万円程度", icon: "👴", cost: 100, recurringCostPerYear: 96, isOneTime: false },
        { id: 6, key: "travel", text: "海外旅行などの大きな娯楽費を考慮しますか？", description: "例: 5年ごとに100万円の大型旅行など", icon: "✈️", cost: 100, isOneTime: false, costInterval: 5 },
        { id: 7, key: "nisa", text: "つみたてNISAなどの投資を行いますか？", description: "月々の積立投資（結果は運用益として反映）", icon: "📈", hasDetail: true, investment: true, detailSettingKey: 'nisaAmountGroup' }
    ],
    defaultAdvancedSettings: {
        retirementAge: 65,
        expectedLifeExpectancy: 95,
        investmentReturnRate: 3.0,
    }
};

// ===== アプリケーション状態 =====
class AppState {
    constructor() {
        this.currentStep = 1;
        this.farthestValidatedStep = 1;
        this.basicInfo = {
            birthday: null,
            income: null,
            occupation: '',
            nationalPension実績Years: 0,
            nationalPension予定Years: 20,
            employeePension実績Years: 0,
            employeePension予定Years: 20,
        };
        this.fixedCosts = {};
        this.lifeEvents = {};
        this.customLifeEvents = [];
        this.detailSettings = {
            childrenCount: 1,
            housingAge: 35,
            nisaAmount: 3.3
        };
        this.advancedSettings = { ...APP_DATA.defaultAdvancedSettings };
        this.results = {};
        this.validationErrors = new Map();
        this.isCalculating = false;
    }

    // 状態の深いコピーを作成
    clone() {
        return JSON.parse(JSON.stringify(this));
    }

    // 状態の検証
    validate() {
        const errors = new Map();
        
        // Step 1の検証
        if (!this.basicInfo.birthday) {
            errors.set('birthDate', '生年月日を選択してください');
        }
        if (!this.basicInfo.income || this.basicInfo.income < 5 || this.basicInfo.income > 300) {
            errors.set('income', '手取り収入を5〜300万円の範囲で入力してください');
        }
        if (!this.basicInfo.occupation) {
            errors.set('occupation', '職業を選択してください');
        }

        this.validationErrors = errors;
        return errors.size === 0;
    }
}

// ===== グローバル変数 =====
let appState = new AppState();
let lifetimeChart = null;
let debounceTimers = new Map();
let currentNotificationId = 0;

// ===== ユーティリティ関数 =====
const Utils = {
    // デバウンス処理
    debounce(key, func, delay = APP_CONFIG.DEBOUNCE_DELAY) {
        if (debounceTimers.has(key)) {
            clearTimeout(debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            debounceTimers.delete(key);
        }, delay);
        
        debounceTimers.set(key, timer);
    },

    // 安全なDOM要素取得
    getElement(id, required = true) {
        const element = document.getElementById(id);
        if (!element && required) {
            console.error(`Required element not found: ${id}`);
            return null;
        }
        return element;
    },

    // 安全な数値解析
    parseNumber(value, defaultValue = 0, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },

    // 安全な整数解析
    parseInt(value, defaultValue = 0, min = -Infinity, max = Infinity) {
        const num = parseInt(value);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },

    // 年齢計算
    calculateAge(birthDate) {
        if (!birthDate) return null;

        try {
            const today = new Date();
            const birth = new Date(birthDate);

            // 無効な日付をチェック
            if (isNaN(birth.getTime()) || birth > today) {
                console.warn('Invalid birth date:', birthDate);
                return null;
            }

            // 未来の日付をチェック
            if (birth.getFullYear() > today.getFullYear()) {
                return null;
            }

            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            // 年齢の妥当性チェック（0-150歳）
            return Math.max(0, Math.min(age, 150));
        } catch (error) {
            console.error('Age calculation error:', error);
            return null;
        }
    },

    // 金額フォーマット
    formatCurrency(amount, unit = '万円') {
        if (typeof amount !== 'number' || isNaN(amount)) return '---';
        
        if (Math.abs(amount) >= 10000) {
            return `${(amount / 10000).toFixed(1)}億${unit.replace('万', '')}`;
        }
        
        return `${Math.round(amount).toLocaleString()}${unit}`;
    },

    // ユニークID生成
    generateId() {
        return `_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
    },

    // 要素のスムーズスクロール
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const targetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    // エラーの安全な処理
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // ユーザーに分かりやすいエラーメッセージを表示
        const userMessage = this.getUserFriendlyErrorMessage(error);
        NotificationManager.show(userMessage, 'error');
    },

    // ユーザーフレンドリーなエラーメッセージ
    getUserFriendlyErrorMessage(error) {
        if (typeof error === 'string') return error;
        
        const message = error?.message || error?.toString() || 'Unknown error';
        
        // 一般的なエラーパターンのマッピング
        const errorMap = {
            'Failed to fetch': 'ネットワークエラーが発生しました',
            'TypeError': 'データの処理中にエラーが発生しました',
            'ReferenceError': 'システムエラーが発生しました',
            'SyntaxError': 'データの読み込み中にエラーが発生しました'
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (message.includes(key)) return value;
        }

        return '予期しないエラーが発生しました。ページを再読み込みしてお試しください。';
    }
};

// ===== 通知管理システム =====
const NotificationManager = {
    show(message, type = 'info', duration = APP_CONFIG.NOTIFICATION_DURATION) {
        const id = ++currentNotificationId;
        const notification = this.createElement(message, type, id);
        
        document.body.appendChild(notification);
        
        // 表示アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });
        
        // 自動削除
        setTimeout(() => {
            this.remove(id);
        }, duration);
        
        return id;
    },

    createElement(message, type, id) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.dataset.id = id;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="NotificationManager.remove(${id})" aria-label="通知を閉じる">
                    ×
                </button>
            </div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: `${20 + (document.querySelectorAll('.notification').length * 80)}px`,
            right: '20px',
            padding: '16px 24px',
            borderRadius: '12px',
            color: 'white',
            background: colors[type] || colors.info,
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '10000',
            transform: 'translateX(120%)',
            opacity: '0',
            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            maxWidth: '400px',
            minWidth: '300px'
        });
        
        return notification;
    },

    remove(id) {
        const notification = document.querySelector(`[data-id="${id}"]`);
        if (!notification) return;
        
        notification.style.transform = 'translateX(120%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.repositionNotifications();
        }, 400);
    },

    repositionNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach((notification, index) => {
            notification.style.top = `${20 + (index * 80)}px`;
        });
    }
};

// ===== フォーム検証システム =====
const ValidationManager = {
    rules: new Map(),
    
    addRule(fieldId, validator, message) {
        if (!this.rules.has(fieldId)) {
            this.rules.set(fieldId, []);
        }
        this.rules.get(fieldId).push({ validator, message });
    },

    validate(fieldId, value) {
        const fieldRules = this.rules.get(fieldId);
        if (!fieldRules) return { isValid: true };

        for (const rule of fieldRules) {
            if (!rule.validator(value)) {
                return {
                    isValid: false,
                    message: rule.message
                };
            }
        }

        return { isValid: true };
    },

    validateAll() {
        const errors = new Map();
        
        for (const [fieldId] of this.rules) {
            const element = Utils.getElement(fieldId, false);
            if (!element) continue;
            
            const result = this.validate(fieldId, element.value);
            if (!result.isValid) {
                errors.set(fieldId, result.message);
            }
        }
        
        return errors;
    },

    setupValidationRules() {
        // 基本情報の検証ルール
        this.addRule('income', 
            (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num >= 5 && num <= 300;
            },
            '手取り収入を5〜300万円の範囲で入力してください'
        );

        this.addRule('occupation',
            (value) => value && value.trim() !== '',
            '職業を選択してください'
        );

        // 年金の検証ルール
        this.addRule('nationalPension実績Years',
            (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 0 && num <= 40;
            },
            '国民年金実績を0〜40年の範囲で入力してください'
        );

        // カスタムライフイベントの検証ルール
        this.addRule('customEventName',
            (value) => value && value.trim().length > 0,
            '支出の名称を入力してください'
        );

        this.addRule('customEventAmount',
            (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num > 0;
            },
            '金額は0より大きい数値を入力してください'
        );
    }
};

// ===== ローカルストレージ管理 =====
const StorageManager = {
    save(data) {
        try {
            const serialized = JSON.stringify({
                version: APP_CONFIG.VERSION,
                timestamp: Date.now(),
                data: data
            });

            // 容量制限チェック（概算5MB）
            if (serialized.length > 5000000) {
                throw new Error('Data too large for localStorage');
            }

            localStorage.setItem(APP_CONFIG.STORAGE_KEY, serialized);
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            if (error.name === 'QuotaExceededError') {
                NotificationManager.show('ストレージ容量が不足しています。データをエクスポートしてブラウザのキャッシュをクリアしてください', 'error');
            } else if (error.message.includes('Data too large')) {
                NotificationManager.show('データサイズが大きすぎます', 'error');
            } else {
                NotificationManager.show('データの保存に失敗しました', 'error');
            }
            return false;
        }
    },

    load() {
        try {
            const stored = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            
            // バージョンチェック
            if (parsed.version !== APP_CONFIG.VERSION) {
                console.warn(`Data version mismatch: ${parsed.version} vs ${APP_CONFIG.VERSION}`);
                return this.migrateData(parsed);
            }

            return parsed.data;
        } catch (error) {
            console.error('Storage load error:', error);
            this.clear();
            return null;
        }
    },

    clear() {
        try {
            localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    migrateData(oldData) {
        try {
            // データ移行ロジック（必要に応じて実装）
            console.log('Migrating data from version:', oldData.version);
            return oldData.data;
        } catch (error) {
            console.error('Data migration error:', error);
            return null;
        }
    },

    export() {
        try {
            const data = this.load();
            if (!data) {
                throw new Error('No data to export');
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                version: APP_CONFIG.VERSION,
                ...data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `生涯収支シミュレーション_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            NotificationManager.show('データをエクスポートしました', 'success');
        } catch (error) {
            Utils.handleError(error, 'Data Export');
        }
    }
};

// ===== UI管理システム =====
const UIManager = {
    // 進捗更新
    updateProgress() {
        const progressFill = Utils.getElement('progressFill');
        const progressPercentage = Utils.getElement('progressPercentage');
        const progressSummary = Utils.getElement('progressSummary');
        
        if (!progressFill) return;

        const percentage = appState.currentStep * 20;
        progressFill.style.width = `${percentage}%`;
        progressFill.setAttribute('aria-valuenow', percentage);
        
        const remaining = 100 - percentage;
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }

        if (progressSummary) {
            const messages = {
                1: 'ステップ 1 / 5 (残り ' + remaining + '%) - 基本情報',
                2: 'ステップ 2 / 5 (残り ' + remaining + '%) - 固定費',
                3: 'ステップ 3 / 5 (残り ' + remaining + '%) - ライフイベント',
                4: 'ステップ 4 / 5 (残り ' + remaining + '%) - 詳細設定',
                5: 'シミュレーション完了！'
            };
            progressSummary.textContent = messages[appState.currentStep] || '';
        }

        this.updateStepLabels();
        this.updateMainSteps();
    },

    // メインステップ更新
    updateMainSteps() {
        const phaseMap = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3 };
        const currentPhase = phaseMap[appState.currentStep] || 1;
        document.querySelectorAll('.main-step').forEach((step, index) => {
            step.classList.toggle('active', index === currentPhase - 1);
        });
    },

    // ステップラベル更新
    updateStepLabels() {
        document.querySelectorAll('.step-label').forEach(label => {
            const stepNum = parseInt(label.dataset.step);
            
            label.classList.remove('active', 'completed', 'clickable');
            label.removeAttribute('aria-current');
            
            if (stepNum === appState.currentStep) {
                label.classList.add('active');
                label.setAttribute('aria-current', 'step');
            } else if (stepNum < appState.currentStep && stepNum <= appState.farthestValidatedStep) {
                label.classList.add('completed');
                label.classList.add('clickable');
            } else if (stepNum <= appState.farthestValidatedStep) {
                label.classList.add('clickable');
            }
            
            label.disabled = stepNum > appState.farthestValidatedStep;
        });
    },

    // ステップ表示切り替え
    showStep(stepNumber) {
        // 現在のステップを非表示
        document.querySelectorAll('.step-section').forEach(section => {
            section.classList.remove('active');
        });

        // 指定されたステップを表示
        const targetStep = Utils.getElement(`step${stepNumber}`);
        if (targetStep) {
            targetStep.classList.add('active');
            
            // スムーズスクロール
            Utils.scrollToElement(targetStep, 100);
            
            // フォーカス管理
            const firstInput = targetStep.querySelector('input, select, button');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                }, APP_CONFIG.ANIMATION_DURATION);
            }
        }

        appState.currentStep = stepNumber;
        this.updateProgress();
    },

    // エラー表示
    showError(elementId, message) {
        this.clearError(elementId);
        
        const inputElement = Utils.getElement(elementId, false);
        const errorElement = Utils.getElement(`${elementId}Error`, false);
        
        if (inputElement) {
            inputElement.classList.add('error');
            inputElement.setAttribute('aria-invalid', 'true');
            
            if (errorElement) {
                inputElement.setAttribute('aria-describedby', errorElement.id);
            }
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.setAttribute('role', 'alert');
        }
    },

    // エラー解除
    clearError(elementId) {
        const inputElement = Utils.getElement(elementId, false);
        const errorElement = Utils.getElement(`${elementId}Error`, false);
        
        if (inputElement) {
            inputElement.classList.remove('error');
            inputElement.removeAttribute('aria-invalid');
            inputElement.removeAttribute('aria-describedby');
        }
        
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.removeAttribute('role');
        }
    },

    // ローディング表示
    showLoading() {
        const loading = Utils.getElement('loadingAnimation');
        if (!loading) return;

        loading.classList.add('active');
        loading.setAttribute('aria-hidden', 'false');
        
        // ローディングステップアニメーション
        this.animateLoadingSteps();
    },

    // ローディング非表示
    hideLoading() {
        const loading = Utils.getElement('loadingAnimation');
        if (!loading) return;

        loading.classList.remove('active');
        loading.setAttribute('aria-hidden', 'true');
    },

    // ローディングステップアニメーション
    animateLoadingSteps() {
        const steps = document.querySelectorAll('.loading-step');
        if (!steps.length) return;

        let currentIndex = 0;
        
        const animate = () => {
            // 全てのステップを非アクティブに
            steps.forEach(step => step.classList.remove('active'));
            
            // 現在のステップをアクティブに
            if (steps[currentIndex]) {
                steps[currentIndex].classList.add('active');
            }
            
            currentIndex = (currentIndex + 1) % steps.length;
        };

        const interval = setInterval(() => {
            if (!document.querySelector('.loading.active')) {
                clearInterval(interval);
                return;
            }
            animate();
        }, 800);
        
        // 初回実行
        animate();
    },

    // プレースホルダー表示制御
    updatePlaceholders(showResults = false) {
        const chartPlaceholder = Utils.getElement('chartPlaceholder', false);
        const chartCanvas = Utils.getElement('lifetimeChart', false);
        const advicePlaceholder = Utils.getElement('advicePlaceholder', false);
        const adviceContent = Utils.getElement('adviceContent', false);

        if (showResults) {
            if (chartPlaceholder) chartPlaceholder.style.display = 'none';
            if (chartCanvas) chartCanvas.style.display = 'block';
            if (advicePlaceholder) advicePlaceholder.style.display = 'none';
            if (adviceContent) adviceContent.style.display = 'grid';
        } else {
            if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
            if (chartCanvas) chartCanvas.style.display = 'none';
            if (advicePlaceholder) advicePlaceholder.style.display = 'flex';
            if (adviceContent) adviceContent.style.display = 'none';
        }
    },
    // クイックガイド表示
    showQuickGuide() {
        const overlay = Utils.getElement("quickGuideOverlay", false);
        if (overlay && !localStorage.getItem("guideShown")) {
            overlay.style.display = "flex";
        }
    },

    // クイックガイド非表示
    closeQuickGuide() {
        const overlay = Utils.getElement("quickGuideOverlay", false);
        if (overlay) {
            overlay.style.display = "none";
        }
        localStorage.setItem("guideShown", "1");
    },
};

// ===== フォーム管理システム =====
const FormManager = {
    // 誕生日セレクト設定
    setupBirthdaySelects() {
        const currentYear = new Date().getFullYear();
        const yearSelect = Utils.getElement('birthYear');
        const monthSelect = Utils.getElement('birthMonth');
        
        if (!yearSelect || !monthSelect) return;

        // 年の選択肢を追加
        for (let year = currentYear - 18; year >= currentYear - 80; year--) {
            const option = new Option(`${year}年`, year);
            yearSelect.appendChild(option);
        }

        // 月の選択肢を追加
        for (let month = 1; month <= 12; month++) {
            const option = new Option(`${month}月`, month);
            monthSelect.appendChild(option);
        }

        // イベントリスナー設定
        [yearSelect, monthSelect].forEach(select => {
            select.addEventListener('change', () => {
                Utils.debounce('updateAge', () => {
                    this.updateAgeDisplay();
                });
            });
        });
    },

    // 年齢表示更新
    updateAgeDisplay() {
        const yearSelect = Utils.getElement('birthYear');
        const monthSelect = Utils.getElement('birthMonth');
        const ageDisplay = Utils.getElement('ageDisplay');
        const currentAgeSpan = Utils.getElement('currentAge');
        
        if (!yearSelect || !monthSelect || !ageDisplay || !currentAgeSpan) return;

        UIManager.clearError('birthDate');

        const year = yearSelect.value;
        const month = monthSelect.value;

        if (year && month) {
            try {
                const birthDate = new Date(parseInt(year), parseInt(month) - 1, 15);
                const age = Utils.calculateAge(birthDate);
                
                if (age !== null) {
                    currentAgeSpan.textContent = age;
                    ageDisplay.style.display = 'block';
                    appState.basicInfo.birthday = birthDate.toISOString().split('T')[0];
                    
                    // 年金設定を年齢に基づいて調整
                    PensionManager.adjustByAge(age);
                } else {
                    ageDisplay.style.display = 'none';
                    appState.basicInfo.birthday = null;
                }
            } catch (error) {
                Utils.handleError(error, 'Age calculation');
                ageDisplay.style.display = 'none';
                appState.basicInfo.birthday = null;
            }
        } else {
            ageDisplay.style.display = 'none';
            appState.basicInfo.birthday = null;
        }

        this.autoSave();
    },

    // フォームデータ復元
    restoreFormData() {
        try {
            // 基本情報の復元
            if (appState.basicInfo.birthday) {
                const birthDate = new Date(appState.basicInfo.birthday);
                if (!isNaN(birthDate.getTime())) {
                    const yearSelect = Utils.getElement('birthYear', false);
                    const monthSelect = Utils.getElement('birthMonth', false);
                    
                    if (yearSelect) yearSelect.value = birthDate.getFullYear();
                    if (monthSelect) monthSelect.value = birthDate.getMonth() + 1;
                }
            }

            this.updateAgeDisplay();

            if (appState.basicInfo.income !== null) {
                const incomeInput = Utils.getElement('income', false);
                if (incomeInput) incomeInput.value = appState.basicInfo.income;
            }

            if (appState.basicInfo.occupation) {
                const occupationSelect = Utils.getElement('occupation', false);
                if (occupationSelect) occupationSelect.value = appState.basicInfo.occupation;
            }

            // 年金フィールドの復元
            this.restorePensionFields();

            // 詳細設定の復元
            Object.keys(appState.advancedSettings).forEach(key => {
                const element = Utils.getElement(key, false);
                if (element && appState.advancedSettings[key] !== undefined) {
                    element.value = appState.advancedSettings[key];
                }
            });

            // ライフイベント詳細設定の復元
            if (appState.detailSettings.childrenCount !== undefined) {
                const element = Utils.getElement('childrenCount', false);
                if (element) element.value = appState.detailSettings.childrenCount;
            }

            if (appState.detailSettings.housingAge !== undefined) {
                const element = Utils.getElement('housingAge', false);
                if (element) element.value = appState.detailSettings.housingAge;
            }

            if (appState.detailSettings.nisaAmount !== undefined) {
                const element = Utils.getElement('nisaAmount', false);
                if (element) element.value = appState.detailSettings.nisaAmount;
            }

            // カスタムライフイベントの復元
            CustomEventManager.render();

            // 結果が存在する場合の復元
            if (appState.results && appState.results.yearlyData && appState.results.yearlyData.length > 0) {
                if (appState.currentStep === 5) {
                    ResultsManager.render();
                    UIManager.updatePlaceholders(true);
                } else {
                    UIManager.updatePlaceholders(false);
                }
            } else {
                UIManager.updatePlaceholders(false);
            }

        } catch (error) {
            Utils.handleError(error, 'Form data restoration');
        }
    },

    // 年金フィールドの復元
    restorePensionFields() {
        const pensionFields = [
            'nationalPension実績Years', 'nationalPension予定Years',
            'employeePension実績Years', 'employeePension予定Years'
        ];

        pensionFields.forEach(fieldId => {
            const value = appState.basicInfo[fieldId];
            if (value !== undefined) {
                const input = Utils.getElement(fieldId, false);
                const slider = Utils.getElement(fieldId.replace('Years', 'Slider'), false);
                
                if (input) input.value = value;
                if (slider) slider.value = value;
            }
        });

        // 年金計算を実行
        setTimeout(() => {
            PensionManager.calculate();
        }, 100);
    },

    // 自動保存
    autoSave() {
        Utils.debounce('autoSave', () => {
            StorageManager.save(appState);
        }, 500);
    },

    // フォームの状態保存
    saveCurrentStepData() {
        try {
            switch (appState.currentStep) {
                case 1:
                    this.saveBasicInfo();
                    break;
                case 2:
                    this.saveFixedCosts();
                    break;
                case 3:
                    this.saveLifeEvents();
                    break;
                case 4:
                    this.saveAdvancedSettings();
                    break;
            }
            this.autoSave();
        } catch (error) {
            Utils.handleError(error, 'Saving current step data');
        }
    },

    // 基本情報保存
    saveBasicInfo() {
        const yearSelect = Utils.getElement('birthYear');
        const monthSelect = Utils.getElement('birthMonth');
        const incomeInput = Utils.getElement('income');
        const occupationSelect = Utils.getElement('occupation');

        if (yearSelect?.value && monthSelect?.value) {
            const birthDate = new Date(parseInt(yearSelect.value), parseInt(monthSelect.value) - 1, 15);
            appState.basicInfo.birthday = birthDate.toISOString().split('T')[0];
        } else {
            appState.basicInfo.birthday = null;
        }

        appState.basicInfo.income = Utils.parseNumber(incomeInput?.value, null, 5, 300);
        appState.basicInfo.occupation = occupationSelect?.value || '';

        // 年金情報の保存
        appState.basicInfo.nationalPension実績Years = Utils.parseInt(Utils.getElement('nationalPension実績Years')?.value, 0, 0, 40);
        appState.basicInfo.nationalPension予定Years = Utils.parseInt(Utils.getElement('nationalPension予定Years')?.value, 20, 0, 40);
        appState.basicInfo.employeePension実績Years = Utils.parseInt(Utils.getElement('employeePension実績Years')?.value, 0, 0, 52);
        appState.basicInfo.employeePension予定Years = Utils.parseInt(Utils.getElement('employeePension予定Years')?.value, 20, 0, 52);
    },

    // 固定費保存
    saveFixedCosts() {
        // FixedCostManagerで既に保存されているので、特別な処理は不要
    },

    // ライフイベント保存
    saveLifeEvents() {
        if (appState.lifeEvents.children) {
            const childrenCountInput = Utils.getElement('childrenCount', false);
            if (childrenCountInput) {
                appState.detailSettings.childrenCount = Utils.parseInt(childrenCountInput.value, 1, 0, 10);
            }
        }

        if (appState.lifeEvents.housing) {
            const housingAgeInput = Utils.getElement('housingAge', false);
            if (housingAgeInput) {
                appState.detailSettings.housingAge = Utils.parseInt(housingAgeInput.value, 35, 20, 70);
            }
        }

        if (appState.lifeEvents.nisa) {
            const nisaAmountInput = Utils.getElement('nisaAmount', false);
            if (nisaAmountInput) {
                appState.detailSettings.nisaAmount = Utils.parseNumber(nisaAmountInput.value, 3.3, 0.1, 30);
            }
        }
    },

    // 詳細設定保存
    saveAdvancedSettings() {
        const retirementAgeInput = Utils.getElement('retirementAge', false);
        const expectedLifeExpectancyInput = Utils.getElement('expectedLifeExpectancy', false);
        const investmentReturnRateInput = Utils.getElement('investmentReturnRate', false);

        if (retirementAgeInput) {
            appState.advancedSettings.retirementAge = Utils.parseInt(retirementAgeInput.value, 65, 55, 75);
        }

        if (expectedLifeExpectancyInput) {
            appState.advancedSettings.expectedLifeExpectancy = Utils.parseInt(expectedLifeExpectancyInput.value, 95, 80, 100);
        }

        if (investmentReturnRateInput) {
            appState.advancedSettings.investmentReturnRate = Utils.parseNumber(investmentReturnRateInput.value, 3.0, 0, 15);
        }
    }
};

// ===== 年金管理システム =====
const PensionManager = {
    // 年齢に基づく年金設定調整
    adjustByAge(age) {
        const retirementAge = Utils.parseInt(Utils.getElement('retirementAge')?.value, 65, 55, 75);
        const occupation = Utils.getElement('occupation')?.value || '';
        
        // 国民年金の調整
        this.adjustNationalPension(age);
        
        // 厚生年金の調整
        this.adjustEmployeePension(age, retirementAge, occupation);
        
        // 年金概算計算
        this.calculate();
    },

    // 国民年金調整
    adjustNationalPension(age) {
        const maxYears = 40;
        const maxAgeForHistory = Math.max(0, Math.min(maxYears, age - 20));
        const maxAgeForFuture = Math.max(0, Math.min(60 - age, maxYears - appState.basicInfo.nationalPension実績Years));

        this.updatePensionField('nationalPension実績', maxAgeForHistory, appState.basicInfo.nationalPension実績Years);
        this.updatePensionField('nationalPension予定', maxAgeForFuture, appState.basicInfo.nationalPension予定Years);
        
        this.updateGuidance('nationalPension', 
            appState.basicInfo.nationalPension実績Years, 
            appState.basicInfo.nationalPension予定Years, 
            maxYears, maxAgeForHistory, maxAgeForFuture);
    },

    // 厚生年金調整
    adjustEmployeePension(age, retirementAge, occupation) {
        const maxYears = 52;
        const maxAgeForHistory = Math.max(0, Math.min(maxYears, age - 18));
        const remainingYears = Math.max(0, retirementAge - age);
        const maxAgeForFuture = Math.min(remainingYears, maxYears - appState.basicInfo.employeePension実績Years);

        // 職業に基づく初期値設定
        let defaultFutureYears = appState.basicInfo.employeePension予定Years;
        const isEmployeeLike = occupation === 'employee' || occupation === 'civil_servant';
        
        if (defaultFutureYears === undefined || defaultFutureYears === null) {
            defaultFutureYears = isEmployeeLike ? maxAgeForFuture : 0;
        }

        this.updatePensionField('employeePension実績', maxAgeForHistory, appState.basicInfo.employeePension実績Years);
        this.updatePensionField('employeePension予定', maxAgeForFuture, defaultFutureYears);
        
        this.updateGuidance('employeePension', 
            appState.basicInfo.employeePension実績Years, 
            appState.basicInfo.employeePension予定Years, 
            maxYears, maxAgeForHistory, maxAgeForFuture);
    },

    // 年金フィールド更新
    updatePensionField(type, maxValue, currentValue) {
        const inputId = `${type}Years`;
        const sliderId = `${type}Slider`;
        const maxLabelId = `${type}SliderMaxLabel`;

        const input = Utils.getElement(inputId, false);
        const slider = Utils.getElement(sliderId, false);
        const maxLabel = Utils.getElement(maxLabelId, false);

        if (input) {
            input.max = maxValue;
            input.value = Math.min(currentValue, maxValue);
        }

        if (slider) {
            slider.max = maxValue;
            slider.value = Math.min(currentValue, maxValue);
        }

        if (maxLabel) {
            maxLabel.textContent = `${maxValue}年`;
        }

        // ステッパーボタンの状態更新
        this.updateStepperButtons(inputId, Math.min(currentValue, maxValue), maxValue);

        // appStateの更新
        const fieldKey = `${type}Years`;
        if (appState.basicInfo.hasOwnProperty(fieldKey)) {
            appState.basicInfo[fieldKey] = Math.min(currentValue, maxValue);
        }
    },

    // ステッパーボタン状態更新
    updateStepperButtons(inputId, value, max) {
        const wrapper = Utils.getElement(inputId, false)?.closest('.pension-years-input-wrapper');
        if (!wrapper) return;

        const minusButton = wrapper.querySelector('.pension-years-stepper[data-step="-1"]');
        const plusButton = wrapper.querySelector('.pension-years-stepper[data-step="1"]');

        if (minusButton) minusButton.disabled = (value <= 0);
        if (plusButton) plusButton.disabled = (value >= max);
    },

    // ガイダンス更新
    updateGuidance(type, history, future, maxTotal, maxHistory, maxFuture) {
        const guidanceElement = Utils.getElement(`${type}Guidance`, false);
        if (!guidanceElement) return;

        const total = history + future;
        let message = `合計: ${history}年 + ${future}年 = ${total}年`;

        if (total > maxTotal) {
            message += ` <span class="warning">最大${maxTotal}年を超えています。</span>`;
        } else {
            message += ` (最大${maxTotal}年まで可能)`;
        }

        if (history > maxHistory) {
            message += ` <span class="warning">実績は年齢に基づき最大${maxHistory}年です。</span>`;
        }

        if (future > maxFuture) {
            message += ` <span class="warning">予定は最大${maxFuture}年です。</span>`;
        }

        guidanceElement.innerHTML = message;
        guidanceElement.style.display = 'block';

        // サマリー更新
        this.updateSummary(type, total, maxTotal);
    },

    // サマリー更新
    updateSummary(type, total, maxTotal) {
        const summaryElement = Utils.getElement(`${type}Summary`, false);
        if (summaryElement) {
            summaryElement.textContent = `合計: ${total}年 / 最大${maxTotal}年`;
        }
    },

    // 年金概算計算
    calculate() {
        const income = Utils.parseNumber(Utils.getElement('income')?.value, 0);
        const npHistory = appState.basicInfo.nationalPension実績Years || 0;
        const npFuture = appState.basicInfo.nationalPension予定Years || 0;
        const epHistory = appState.basicInfo.employeePension実績Years || 0;
        const epFuture = appState.basicInfo.employeePension予定Years || 0;

        const totalNationalPensionYears = npHistory + npFuture;
        const totalEmployeePensionYears = epHistory + epFuture;

        const pensionEstimate = Utils.getElement('pensionEstimate');
        
        if (income <= 0 && totalNationalPensionYears <= 0 && totalEmployeePensionYears <= 0) {
            if (pensionEstimate) pensionEstimate.style.display = 'none';
            return;
        }

        // 国民年金計算
        const nationalPensionFullAnnual = 816000;
        const nationalPensionMonthly = (nationalPensionFullAnnual * (Math.min(totalNationalPensionYears, 40) / 40)) / 12;

        // 厚生年金計算
        let employeePensionMonthly = 0;
        if (totalEmployeePensionYears > 0 && income > 0) {
            const estimatedGrossMonthlySalary = income * 10000 * 1.35;
            const averageStandardReward = Math.min(Math.max(estimatedGrossMonthlySalary, 88000), 650000);
            employeePensionMonthly = (averageStandardReward * (5.481 / 1000) * (totalEmployeePensionYears * 12)) / 12;
            employeePensionMonthly = Math.max(0, employeePensionMonthly);
        }

        const totalPensionMonthly = nationalPensionMonthly + employeePensionMonthly;

        // 結果表示
        this.displayPensionResults(nationalPensionMonthly, employeePensionMonthly, totalPensionMonthly);
    },

    // 年金結果表示
    displayPensionResults(national, employee, total) {
        const nationalElement = Utils.getElement('nationalPensionAmount', false);
        const employeeElement = Utils.getElement('employeePensionAmount', false);
        const totalElement = Utils.getElement('totalPensionAmount', false);
        const estimateElement = Utils.getElement('pensionEstimate', false);

        if (nationalElement) {
            nationalElement.textContent = `${Math.round(national).toLocaleString()}円`;
        }

        if (employeeElement) {
            employeeElement.textContent = `${Math.round(employee).toLocaleString()}円`;
        }

        if (totalElement) {
            totalElement.textContent = `${Math.round(total).toLocaleString()}円`;
        }

        if (estimateElement) {
            estimateElement.style.display = 'block';
        }
    },

    // 年金入力フィールド設定
    setupInputs() {
        const pensionFields = [
            { type: 'nationalPension', period: '実績' },
            { type: 'nationalPension', period: '予定' },
            { type: 'employeePension', period: '実績' },
            { type: 'employeePension', period: '予定' }
        ];

        pensionFields.forEach(field => {
            const sliderId = `${field.type}${field.period}Slider`;
            const inputId = `${field.type}${field.period}Years`;
            
            this.setupSliderInput(sliderId, inputId, field);
        });

        this.setupSteppers();
    },

    // スライダー入力設定
    setupSliderInput(sliderId, inputId, field) {
        const slider = Utils.getElement(sliderId, false);
        const input = Utils.getElement(inputId, false);

        if (!slider || !input) return;

        const updateValue = (value) => {
            const stateKey = `${field.type}${field.period}Years`;
            appState.basicInfo[stateKey] = parseInt(value);
            
            UIManager.clearError(inputId);
            UIManager.clearError(`${field.type}Total`);
            
            const age = Utils.calculateAge(appState.basicInfo.birthday);
            if (age !== null) {
                this.adjustByAge(age);
            }
            
            FormManager.autoSave();
        };

        slider.addEventListener('input', () => {
            input.value = slider.value;
            updateValue(slider.value);
        });

        input.addEventListener('input', () => {
            const max = parseInt(slider.max);
            let value = Utils.parseInt(input.value, 0, 0, max);
            input.value = value;
            slider.value = value;
            updateValue(value);
        });
    },

    // ステッパー設定
    setupSteppers() {
        document.querySelectorAll('.pension-years-stepper').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const step = parseInt(button.dataset.step);
                const targetInput = Utils.getElement(targetId, false);
                
                if (!targetInput) return;

                const currentValue = Utils.parseInt(targetInput.value, 0);
                const min = Utils.parseInt(targetInput.min, 0);
                const max = Utils.parseInt(targetInput.max, Infinity);
                const newValue = Math.max(min, Math.min(currentValue + step, max));
                
                targetInput.value = newValue;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    }
};

// ===== 固定費管理システム =====
const FixedCostManager = {
    render() {
        const container = Utils.getElement('fixedCostsGrid');
        if (!container) return;

        container.innerHTML = '';

        APP_DATA.categories.forEach(category => {
            const savedCost = appState.fixedCosts[category.id] || {
                amount: ['housing', 'food', 'utilities'].includes(category.id) ? 
                    Utils.parseNumber(category.placeholder, 0) : 0,
                isActive: false
            };

            const item = this.createCostItem(category, savedCost);
            container.appendChild(item);
        });

        this.updateSummary();
    },

    createCostItem(category, savedCost) {
        const item = document.createElement('div');
        item.className = `fixed-cost-item ${savedCost.amount > 0 ? 'active' : ''}`;
        
        item.innerHTML = `
            <div class="cost-icon" aria-hidden="true">${category.icon}</div>
            <div class="cost-details">
                <div class="cost-name">${category.name}</div>
                <div class="cost-description">${category.description}</div>
                <div class="cost-controls">
                    <div class="input-wrapper">
                        <input type="number" 
                               class="cost-input form-control" 
                               id="cost-${category.id}"
                               placeholder="${category.placeholder}" 
                               min="0" 
                               max="${category.max}" 
                               step="0.1"
                               value="${savedCost.amount > 0 ? savedCost.amount.toFixed(1) : ''}"
                               aria-label="${category.name}の月額"
                               aria-describedby="cost-${category.id}-help">
                        <span class="input-unit">万円</span>
                    </div>
                </div>
            </div>
            <div id="cost-${category.id}-help" class="input-help">
                月額${category.max}万円まで入力可能
            </div>
        `;

        const input = item.querySelector(`#cost-${category.id}`);
        input.addEventListener('input', () => {
            Utils.debounce('updateFixedCosts', () => {
                this.updateCosts();
            });
        });

        return item;
    },

    updateCosts() {
        let total = 0;
        const fixedCosts = {};

        APP_DATA.categories.forEach(category => {
            const input = Utils.getElement(`cost-${category.id}`, false);
            if (!input) return;

            const amount = Utils.parseNumber(input.value, 0, 0, category.max);
            const isActive = amount > 0;
            
            fixedCosts[category.id] = { amount, isActive };
            
            const itemElement = input.closest('.fixed-cost-item');
            if (itemElement) {
                itemElement.classList.toggle('active', isActive);
            }
            
            if (isActive) total += amount;
        });

        appState.fixedCosts = fixedCosts;
        this.updateSummary();
        FormManager.autoSave();
    },

    updateSummary() {
        const total = Object.values(appState.fixedCosts)
            .reduce((sum, cost) => cost.isActive ? sum + cost.amount : sum, 0);

        const totalElement = Utils.getElement('totalFixedCosts', false);
        if (totalElement) {
            totalElement.textContent = Utils.formatCurrency(total);
        }

        const income = appState.basicInfo.income || 0;
        const ratio = income > 0 ? (total / income * 100) : 0;

        const ratioElement = Utils.getElement('fixedCostsRatio', false);
        if (ratioElement) {
            ratioElement.textContent = `${ratio.toFixed(0)}%`;
        }

        this.updateRatioAdvice(ratio);
    },

    updateRatioAdvice(ratio) {
        const adviceElement = Utils.getElement('ratioAdvice', false);
        if (!adviceElement) return;

        let advice = '';
        let className = '';

        if (ratio <= 30) {
            advice = '✅ 理想的な固定費比率です！家計に余裕があります。';
            className = 'advice-good';
        } else if (ratio <= 50) {
            advice = '🤔 固定費比率がやや高めです。無理のない範囲で見直せる項目がないか確認してみましょう。';
            className = 'advice-warning';
        } else {
            advice = '🚨 固定費比率が高すぎます！家計の見直しを強くおすすめします。';
            className = 'advice-error';
        }

        adviceElement.textContent = advice;
        adviceElement.className = `ratio-advice ${className}`;
    }
};

// ===== ライフイベント管理システム =====
const LifeEventManager = {
    render() {
        const container = Utils.getElement('lifeEventsGrid');
        if (!container) return;

        container.innerHTML = '';

        APP_DATA.lifeEvents.forEach(event => {
            const item = this.createEventItem(event);
            container.appendChild(item);
        });

        this.updateDetailSettingsVisibility();
    },

    createEventItem(event) {
        const isActive = appState.lifeEvents[event.key] || false;
        
        const item = document.createElement('div');
        item.className = `life-event-item ${isActive ? 'selected' : ''}`;
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-pressed', isActive);
        item.dataset.eventKey = event.key;

        item.innerHTML = `
            <div class="event-icon" aria-hidden="true">${event.icon}</div>
            <div class="event-content">
                <div class="event-text">${event.text}</div>
                <div class="event-description">${event.description}</div>
            </div>
            <div class="toggle-switch ${isActive ? 'active' : ''}" aria-hidden="true">
                <div class="toggle-slider"></div>
            </div>
        `;

        // イベントリスナー設定
        item.addEventListener('click', () => this.toggleEvent(event.key, item));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleEvent(event.key, item);
            }
        });

        return item;
    },

    toggleEvent(eventKey, itemElement) {
        const isActive = !appState.lifeEvents[eventKey];
        
        appState.lifeEvents[eventKey] = isActive;
        
        // UI更新
        itemElement.classList.toggle('selected', isActive);
        itemElement.setAttribute('aria-pressed', isActive);
        
        const toggleSwitch = itemElement.querySelector('.toggle-switch');
        if (toggleSwitch) {
            toggleSwitch.classList.toggle('active', isActive);
        }

        this.updateDetailSettingsVisibility();
        
        // 非選択時はエラーをクリア
        if (!isActive) {
            const eventConfig = APP_DATA.lifeEvents.find(e => e.key === eventKey);
            if (eventConfig?.detailSettingKey) {
                const groupElement = Utils.getElement(eventConfig.detailSettingKey, false);
                if (groupElement) {
                    groupElement.querySelectorAll('input').forEach(input => {
                        UIManager.clearError(input.id);
                    });
                }
            }
        }

        FormManager.autoSave();
        
        // アクセシビリティフィードバック
        const eventName = APP_DATA.lifeEvents.find(e => e.key === eventKey)?.text || eventKey;
        NotificationManager.show(
            `${eventName}を${isActive ? '選択' : '選択解除'}しました`,
            'info',
            2000
        );
    },

    updateDetailSettingsVisibility() {
        APP_DATA.lifeEvents.forEach(event => {
            if (!event.hasDetail || !event.detailSettingKey) return;

            const groupElement = Utils.getElement(event.detailSettingKey, false);
            if (!groupElement) return;

            const isActive = appState.lifeEvents[event.key] || false;
            groupElement.style.display = isActive ? 'block' : 'none';
            
            // フォーム要素の必須/無効状態を更新
            groupElement.querySelectorAll('input, select').forEach(input => {
                input.required = isActive;
                input.disabled = !isActive;
                
                if (isActive) {
                    input.removeAttribute('aria-hidden');
                } else {
                    input.setAttribute('aria-hidden', 'true');
                }
            });
        });
    }
};

// ===== カスタムライフイベント管理システム =====
const CustomEventManager = {
    render() {
        const listElement = Utils.getElement('customLifeEventsList', false);
        const placeholderElement = Utils.getElement('customEventsPlaceholder', false);

        if (!listElement || !placeholderElement) return;

        listElement.innerHTML = '';

        if (appState.customLifeEvents.length === 0) {
            placeholderElement.style.display = 'block';
        } else {
            placeholderElement.style.display = 'none';
            appState.customLifeEvents.forEach(event => {
                const item = this.createEventItem(event);
                listElement.appendChild(item);
            });
        }
    },

    createEventItem(event) {
        const item = document.createElement('div');
        item.className = 'custom-event-item';
        item.dataset.id = event.id;
        
        item.innerHTML = `
            <div class="custom-event-details">
                <strong>${event.name}</strong>: ${Utils.formatCurrency(event.amount)} (${event.age}歳時)
            </div>
            <div class="custom-event-actions">
                <button type="button" 
                        class="btn btn--secondary btn--icon-only edit-custom-event" 
                        aria-label="${event.name}を編集"
                        title="編集">
                    ✏️
                </button>
                <button type="button" 
                        class="btn btn--danger btn--icon-only delete-custom-event" 
                        aria-label="${event.name}を削除"
                        title="削除">
                    🗑️
                </button>
            </div>
        `;

        return item;
    },

    setup() {
        const addButton = Utils.getElement('addCustomEventButton', false);
        const saveButton = Utils.getElement('saveCustomEventButton', false);
        const cancelButton = Utils.getElement('cancelCustomEventButton', false);
        const formContainer = Utils.getElement('customEventFormContainer', false);

        if (!addButton || !saveButton || !cancelButton || !formContainer) return;

        // イベントリスナー設定
        addButton.addEventListener('click', () => this.showForm());
        cancelButton.addEventListener('click', () => this.hideForm());
        saveButton.addEventListener('click', () => this.saveEvent());

        // リストのイベントデリゲーション
        const listElement = Utils.getElement('customLifeEventsList', false);
        if (listElement) {
            listElement.addEventListener('click', (e) => this.handleListClick(e));
        }

        this.render();
    },

    showForm(isEdit = false, eventData = null) {
        const formContainer = Utils.getElement('customEventFormContainer');
        const formTitle = Utils.getElement('customEventFormTitle');
        const addButton = Utils.getElement('addCustomEventButton');
        
        if (!formContainer || !formTitle || !addButton) return;

        this.resetForm();

        if (isEdit && eventData) {
            formTitle.textContent = '支出の編集';
            Utils.getElement('customEventId').value = eventData.id;
            Utils.getElement('customEventName').value = eventData.name;
            Utils.getElement('customEventAmount').value = eventData.amount;
            Utils.getElement('customEventAge').value = eventData.age;
        } else {
            formTitle.textContent = '支出の追加';
        }

        formContainer.style.display = 'block';
        addButton.style.display = 'none';
        
        // フォーカス設定
        const nameInput = Utils.getElement('customEventName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    },

    hideForm() {
        const formContainer = Utils.getElement('customEventFormContainer');
        const addButton = Utils.getElement('addCustomEventButton');
        
        if (formContainer) formContainer.style.display = 'none';
        if (addButton) addButton.style.display = 'inline-flex';
        
        this.resetForm();
    },

    resetForm() {
        const inputs = ['customEventId', 'customEventName', 'customEventAmount', 'customEventAge'];
        inputs.forEach(id => {
            const element = Utils.getElement(id, false);
            if (element) element.value = '';
            UIManager.clearError(id);
        });
    },

    saveEvent() {
        const id = Utils.getElement('customEventId').value;
        const name = Utils.getElement('customEventName').value.trim();
        const amount = Utils.parseNumber(Utils.getElement('customEventAmount').value, 0, 1);
        const age = Utils.parseInt(Utils.getElement('customEventAge').value, 0, 18, 100);

        // バリデーション
        if (!this.validateEvent(name, amount, age)) return;

        if (id) {
            // 編集
            const index = appState.customLifeEvents.findIndex(e => e.id === id);
            if (index > -1) {
                appState.customLifeEvents[index] = { id, name, amount, age };
            }
        } else {
            // 新規追加
            appState.customLifeEvents.push({
                id: Utils.generateId(),
                name,
                amount,
                age
            });
        }

        this.render();
        this.hideForm();
        FormManager.autoSave();
        
        NotificationManager.show(
            `${name}を${id ? '更新' : '追加'}しました`,
            'success'
        );
    },

    validateEvent(name, amount, age) {
        let isValid = true;

        if (!name) {
            UIManager.showError('customEventName', '支出の名称を入力してください');
            isValid = false;
        }

        if (amount <= 0) {
            UIManager.showError('customEventAmount', '金額は0より大きい数値を入力してください');
            isValid = false;
        }

        const currentAge = Utils.calculateAge(appState.basicInfo.birthday);
        if (currentAge === null) {
            UIManager.showError('customEventAge', '先に生年月日を入力してください');
            isValid = false;
        } else {
            const maxAge = appState.advancedSettings.expectedLifeExpectancy || 100;
            const minAge = Math.max(18, currentAge);

            if (age < minAge || age > maxAge) {
                UIManager.showError('customEventAge', `発生年齢は${minAge}歳から${maxAge}歳の範囲で入力してください`);
                isValid = false;
            }
        }

        return isValid;
    },

    handleListClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const eventItem = button.closest('.custom-event-item');
        if (!eventItem) return;

        const eventId = eventItem.dataset.id;
        const eventData = appState.customLifeEvents.find(e => e.id === eventId);
        
        if (!eventData) return;

        if (button.classList.contains('edit-custom-event')) {
            this.showForm(true, eventData);
        } else if (button.classList.contains('delete-custom-event')) {
            this.deleteEvent(eventId, eventData.name);
        }
    },

    deleteEvent(eventId, eventName) {
        if (!confirm(`「${eventName}」を削除してもよろしいですか？`)) return;

        appState.customLifeEvents = appState.customLifeEvents.filter(e => e.id !== eventId);
        this.render();
        FormManager.autoSave();
        
        NotificationManager.show(`${eventName}を削除しました`, 'success');
    }
};

// ===== バリデーション管理システム =====
const StepValidator = {
    validateStep(stepNumber) {
        const errors = new Map();

        switch (stepNumber) {
            case 1:
                this.validateBasicInfo(errors);
                break;
            case 2:
                this.validateFixedCosts(errors);
                break;
            case 3:
                this.validateLifeEvents(errors);
                break;
            case 4:
                this.validateAdvancedSettings(errors);
                break;
        }

        return errors;
    },

    validateBasicInfo(errors) {
        // 生年月日の検証
        if (!appState.basicInfo.birthday) {
            errors.set('birthDate', '生年月日を選択してください');
        }

        // 収入の検証
        const income = appState.basicInfo.income;
        if (!income || income < 5 || income > 300) {
            errors.set('income', '手取り収入を5〜300万円の範囲で入力してください');
        }

        // 職業の検証
        if (!appState.basicInfo.occupation) {
            errors.set('occupation', '職業を選択してください');
        }

        // 年金の検証
        this.validatePension(errors);
    },

    validatePension(errors) {
        const npHistory = appState.basicInfo.nationalPension実績Years || 0;
        const npFuture = appState.basicInfo.nationalPension予定Years || 0;
        const epHistory = appState.basicInfo.employeePension実績Years || 0;
        const epFuture = appState.basicInfo.employeePension予定Years || 0;

        // 国民年金の検証
        if (npHistory < 0 || npHistory > 40) {
            errors.set('nationalPension実績Years', '国民年金実績を0〜40年で入力してください');
        }
        if (npFuture < 0 || npFuture > 40) {
            errors.set('nationalPension予定Years', '国民年金予定を0〜40年で入力してください');
        }
        if ((npHistory + npFuture) > 40) {
            errors.set('nationalPensionTotal', '国民年金の合計は40年を超えることはできません');
        }

        // 厚生年金の検証
        if (epHistory < 0 || epHistory > 52) {
            errors.set('employeePension実績Years', '厚生年金実績を適切な範囲で入力してください');
        }
        if (epFuture < 0 || epFuture > 52) {
            errors.set('employeePension予定Years', '厚生年金予定を適切な範囲で入力してください');
        }
        if ((epHistory + epFuture) > 52) {
            errors.set('employeePensionTotal', '厚生年金の合計年数が長すぎます');
        }
    },

    validateFixedCosts(errors) {
        let hasInvalidCost = false;
        
        APP_DATA.categories.forEach(category => {
            const cost = appState.fixedCosts[category.id];
            if (cost && cost.amount > category.max) {
                errors.set(`cost-${category.id}`, `${category.name}は${category.max}万円以下で入力してください`);
                hasInvalidCost = true;
            }
        });

        return !hasInvalidCost;
    },

    validateLifeEvents(errors) {
        // ライフイベント詳細設定の検証
        if (appState.lifeEvents.children) {
            const childrenCount = appState.detailSettings.childrenCount;
            if (childrenCount < 0 || childrenCount > 10) {
                errors.set('childrenCount', '子供の人数を0〜10人で入力してください');
            }
        }

        if (appState.lifeEvents.housing) {
            const housingAge = appState.detailSettings.housingAge;
            const currentAge = Utils.calculateAge(appState.basicInfo.birthday);
            if (currentAge && housingAge < currentAge) {
                errors.set('housingAge', '住宅購入年齢は現在年齢以上で設定してください');
            }
            if (housingAge < 20 || housingAge > 70) {
                errors.set('housingAge', '住宅購入年齢を20〜70歳で入力してください');
            }
        }

        if (appState.lifeEvents.nisa) {
            const nisaAmount = appState.detailSettings.nisaAmount;
            if (nisaAmount < 0.1 || nisaAmount > 30) {
                errors.set('nisaAmount', 'NISA月額を0.1〜30万円で入力してください');
            }
        }

        // カスタムイベントフォームが開いている場合
        const formContainer = Utils.getElement('customEventFormContainer', false);
        if (formContainer && formContainer.style.display === 'block') {
            errors.set('customEventForm', '大きな支出フォームが開いています。保存するかキャンセルしてください');
        }
    },

    validateAdvancedSettings(errors) {
        const settings = [
            { key: 'retirementAge', min: 55, max: 75, name: 'リタイア希望年齢' },
            { key: 'expectedLifeExpectancy', min: 80, max: 100, name: '想定寿命' },
            { key: 'investmentReturnRate', min: 0, max: 15, name: '期待運用利回り' }
        ];

        settings.forEach(setting => {
            const value = appState.advancedSettings[setting.key];
            if (value < setting.min || value > setting.max) {
                errors.set(setting.key, `${setting.name}を${setting.min}〜${setting.max}の範囲で入力してください`);
            }
        });
    },

    showValidationErrors(errors) {
        // 既存のエラーをクリア
        document.querySelectorAll('.input-error-message').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.form-control.error').forEach(el => {
            el.classList.remove('error');
        });

        // エラーを表示
        for (const [fieldId, message] of errors) {
            UIManager.showError(fieldId, message);
        }

        // 最初のエラーにフォーカス
        if (errors.size > 0) {
            const firstErrorId = errors.keys().next().value;
            const firstErrorElement = Utils.getElement(firstErrorId, false);
            if (firstErrorElement) {
                Utils.scrollToElement(firstErrorElement, 150);
                setTimeout(() => {
                    firstErrorElement.focus();
                }, 300);
            }
        }
    }
};

// ===== ナビゲーション管理システム =====
const NavigationManager = {
    nextStep() {
        const errors = StepValidator.validateStep(appState.currentStep);
        
        if (errors.size > 0) {
            StepValidator.showValidationErrors(errors);
            NotificationManager.show('入力内容を確認してください', 'error');
            return;
        }

        FormManager.saveCurrentStepData();

        if (appState.currentStep < 5) {
            appState.currentStep++;
            appState.farthestValidatedStep = Math.max(appState.farthestValidatedStep, appState.currentStep);
            UIManager.showStep(appState.currentStep);
            NotificationManager.show('次のステップに進みました', 'success', 2000);
        }
    },

    previousStep() {
        if (appState.currentStep > 1) {
            FormManager.saveCurrentStepData();
            appState.currentStep--;
            UIManager.showStep(appState.currentStep);
        }
    },

    goToStep(targetStep) {
        if (targetStep < appState.currentStep && targetStep <= appState.farthestValidatedStep) {
            // 戻る場合
            appState.currentStep = targetStep;
            UIManager.showStep(appState.currentStep);
        } else if (targetStep === appState.currentStep) {
            // 現在のステップ
            return;
        } else if (targetStep <= appState.farthestValidatedStep) {
            // 先に進む場合（検証済み）
            const errors = StepValidator.validateStep(appState.currentStep);
            if (errors.size === 0) {
                FormManager.saveCurrentStepData();
                appState.currentStep = targetStep;
                UIManager.showStep(appState.currentStep);
            } else {
                StepValidator.showValidationErrors(errors);
                NotificationManager.show('現在のステップの入力内容を修正してください', 'error');
            }
        } else {
            // 未検証のステップ
            NotificationManager.show('まだこのステップには進めません。順番に入力してください', 'info');
        }
    }
};

// ===== 計算エンジン =====
const CalculationEngine = {
    async calculate() {
        try {
            appState.isCalculating = true;
            UIManager.showLoading();
            
            // 最終ステップのデータ保存
            FormManager.saveCurrentStepData();
            
            // 計算実行
            await new Promise(resolve => setTimeout(resolve, APP_CONFIG.CALCULATION_DELAY));
            
            const results = this.performCalculation();
            
            if (results && results.yearlyData.length > 0) {
                appState.results = results;
                appState.currentStep = 5;
                appState.farthestValidatedStep = Math.max(appState.farthestValidatedStep, 5);
                
                UIManager.hideLoading();
                UIManager.showStep(5);
                ResultsManager.render();
                UIManager.updatePlaceholders(true);
                
                NotificationManager.show('計算が完了しました！', 'success');
            } else {
                throw new Error('計算結果が無効です');
            }
            
        } catch (error) {
            UIManager.hideLoading();
            Utils.handleError(error, 'Calculation');
        } finally {
            appState.isCalculating = false;
        }
    },

    performCalculation() {
        const currentAge = Utils.calculateAge(appState.basicInfo.birthday);
        if (currentAge === null) {
            throw new Error('年齢が計算できません');
        }

        const { retirementAge, expectedLifeExpectancy, investmentReturnRate } = appState.advancedSettings;
        const invRate = investmentReturnRate / 100;

        let totalIncome = 0;
        let totalExpenses = 0;
        let yearlyData = [];
        let nisaBalance = 0;
        let cashBalance = 0;

        // 年ごとの計算
        for (let age = currentAge; age <= expectedLifeExpectancy; age++) {
            const yearData = this.calculateYearData(age, currentAge, retirementAge, invRate, nisaBalance, cashBalance);
            
            totalIncome += yearData.income;
            totalExpenses += yearData.cashExpense;
            nisaBalance = yearData.nisaBalance;
            cashBalance = yearData.cumulativeCash;
            
            yearlyData.push(yearData);
        }

        const finalBalance = cashBalance + nisaBalance;
        const retirementData = yearlyData.find(d => d.age === retirementAge) || yearlyData[yearlyData.length - 1];
        
        return {
            totalIncome,
            totalExpenses,
            finalBalance,
            retirementAssets: retirementData?.totalAssets || 0,
            retirementCash: retirementData?.cumulativeCash || 0,
            retirementNisa: retirementData?.nisaBalance || 0,
            nisaFinalContribution: yearlyData.reduce((sum, d) => sum + d.nisaInvestment, 0),
            nisaFinalBalance: nisaBalance,
            yearlyData,
            rating: this.calculateRating(finalBalance, totalIncome, expectedLifeExpectancy - currentAge)
        };
    },

    calculateYearData(age, currentAge, retirementAge, invRate, prevNisaBalance, prevCashBalance) {
        // 収入計算
        const income = (age < retirementAge) ? 
            (appState.basicInfo.income * 12) : 
            (this.getPensionAmount() * 12);

        // 支出計算
        let cashExpense = this.calculateFixedCosts();
        cashExpense += this.calculateLifeEventCosts(age, currentAge);

        // NISA投資額
        let nisaInvestment = 0;
        if (appState.lifeEvents.nisa && age < retirementAge && appState.detailSettings.nisaAmount > 0) {
            nisaInvestment = appState.detailSettings.nisaAmount * 12;
        }

        // NISA残高更新
        const nisaBalance = (prevNisaBalance + nisaInvestment) * (1 + invRate);

        // 現金収支
        const netCashFlow = income - cashExpense - nisaInvestment;
        const cumulativeCash = prevCashBalance + netCashFlow;

        return {
            age,
            income,
            cashExpense,
            nisaInvestment,
            netCashFlow,
            cumulativeCash,
            nisaBalance,
            totalAssets: cumulativeCash + nisaBalance
        };
    },

    calculateFixedCosts() {
        let total = Object.values(appState.fixedCosts)
            .reduce((sum, cost) => cost.isActive ? sum + (cost.amount * 12) : sum, 0);

        // デフォルト生活費の適用
        const allCostsZero = Object.values(appState.fixedCosts)
            .every(cost => !cost.isActive || cost.amount === 0);

        if (allCostsZero && total === 0) {
            const income = appState.basicInfo.income || 0;
            const defaultCost = Math.max(income * 0.3, 15);
            total = defaultCost * 12;
        }

        return total;
    },

    calculateLifeEventCosts(age, currentAge) {
        let eventCosts = 0;

        // 標準ライフイベント
        APP_DATA.lifeEvents.forEach(event => {
            if (!appState.lifeEvents[event.key]) return;

            eventCosts += this.calculateEventCost(event, age, currentAge);
        });

        // カスタムライフイベント
        appState.customLifeEvents.forEach(customEvent => {
            if (customEvent.age === age) {
                eventCosts += customEvent.amount;
            }
        });

        return eventCosts;
    },

    calculateEventCost(event, age, currentAge) {
        let cost = 0;

        switch (event.key) {
            case "marriage":
                const marriageAge = Math.max(currentAge + 2, 25);
                if (age === marriageAge && event.isOneTime) {
                    cost += event.cost;
                }
                break;

            case "car":
                const carStartAge = Math.max(currentAge + 3, 20);
                if (age >= carStartAge) {
                    if ((age - carStartAge) % (event.costInterval || 10) === 0) {
                        cost += event.cost;
                    }
                    if (event.recurringCostPerYear) {
                        cost += event.recurringCostPerYear;
                    }
                }
                break;

            case "children":
                const childrenCount = appState.detailSettings.childrenCount || 0;
                if (childrenCount > 0) {
                    const firstChildAge = Math.max(currentAge + 2, 25);
                    for (let i = 0; i < childrenCount; i++) {
                        const childBirthAge = firstChildAge + (i * 2);
                        const childCurrentAge = age - childBirthAge;
                        if (childCurrentAge >= 0 && childCurrentAge < 22) {
                            cost += (event.cost / childrenCount) / 22;
                        }
                    }
                }
                break;

            case "housing":
                const housingAge = appState.detailSettings.housingAge;
                if (age === housingAge && event.isOneTime) {
                    cost += event.cost;
                }
                if (age > housingAge) {
                    cost += event.cost * 0.005; // 固定資産税等
                }
                break;

            case "caregiving":
                const careStartAge = Math.max(currentAge, 50);
                if (age === careStartAge && event.cost) {
                    cost += event.cost;
                }
                if (age >= careStartAge && event.recurringCostPerYear) {
                    cost += event.recurringCostPerYear;
                }
                break;

            case "travel":
                const travelStartAge = Math.max(currentAge + 5, 25);
                if (age >= travelStartAge && (age - travelStartAge) % (event.costInterval || 5) === 0) {
                    cost += event.cost;
                }
                break;
        }

        return cost;
    },

    getPensionAmount() {
        const { income, nationalPension実績Years, nationalPension予定Years, employeePension実績Years, employeePension予定Years } = appState.basicInfo;
        
        const totalNpYears = nationalPension実績Years + nationalPension予定Years;
        const totalEpYears = employeePension実績Years + employeePension予定Years;

        // 国民年金
        const nationalPensionFullAnnual = 816000;
        const npMonthly = (nationalPensionFullAnnual * (Math.min(totalNpYears, 40) / 40)) / 12;

        // 厚生年金
        let epMonthly = 0;
        if (totalEpYears > 0 && income > 0) {
            const estimatedGrossMonthlySalary = income * 10000 * 1.35;
            const averageStandardReward = Math.min(Math.max(estimatedGrossMonthlySalary, 88000), 650000);
            const annualBenefit = averageStandardReward * (5.481 / 1000) * (totalEpYears * 12);
            epMonthly = Math.max(0, annualBenefit / 12);
        }

        return (npMonthly + epMonthly) / 10000; // 万円単位に変換
    },

    calculateRating(finalBalance, totalIncome, durationYears) {
        const avgAnnualIncome = totalIncome / (durationYears || 1) || (appState.basicInfo.income * 12) || 360;
        
        if (finalBalance >= avgAnnualIncome * 5) return 'S';
        if (finalBalance >= avgAnnualIncome * 2) return 'A';
        if (finalBalance >= 0) return 'B';
        if (finalBalance >= -avgAnnualIncome * 1) return 'C';
        return 'D';
    }
};

// ===== 結果表示管理システム =====
const ResultsManager = {
    render() {
        this.renderRatingAndSummary();
        this.renderSummaryCards();
        this.renderChart();
        this.renderAdvice();
    },

    renderRatingAndSummary() {
        const ratingContainer = Utils.getElement('ratingDisplay', false);
        const summaryContainer = Utils.getElement('resultsMainSummary', false);
        
        if (!ratingContainer || !summaryContainer) return;

        const { rating, finalBalance } = appState.results;
        const { expectedLifeExpectancy } = appState.advancedSettings;

        // レーティング表示
        const ratingTexts = {
            'S': '素晴らしい未来設計です！',
            'A': '堅実な家計プランです！',
            'B': '安定した見通しです。',
            'C': 'やや注意が必要です。',
            'D': '家計改善を検討しましょう。'
        };

        ratingContainer.innerHTML = `<div class="rating-badge rating-${rating.toLowerCase()}">${rating}</div>`;

        // サマリーテキスト
        const finalBalanceFormatted = Utils.formatCurrency(finalBalance);
        let summaryText = `あなたの生涯収支評価は <strong>「${rating}」</strong> です。${ratingTexts[rating]}<br>`;
        summaryText += `${expectedLifeExpectancy}歳時点での予測総資産は <strong>${finalBalanceFormatted}</strong> となりました。`;
        
        if (finalBalance < 0) {
            summaryText += ' 残念ながらマイナス収支のため、将来の資金計画の見直しをおすすめします。';
        } else {
            summaryText += ' この調子で計画的な資産形成を続けましょう！';
        }

        summaryContainer.innerHTML = `<p>${summaryText}</p>`;
    },

    renderSummaryCards() {
        const container = Utils.getElement('resultsSummaryCards', false);
        if (!container) return;

        const { totalIncome, totalExpenses, finalBalance, retirementAssets } = appState.results;
        const { expectedLifeExpectancy, retirementAge } = appState.advancedSettings;

        const cards = [
            {
                icon: '💰',
                label: '生涯総収入（予測）',
                value: Utils.formatCurrency(totalIncome),
                positive: true
            },
            {
                icon: '💸',
                label: '生涯総支出（NISA投資除く）',
                value: Utils.formatCurrency(totalExpenses),
                positive: false
            },
            {
                icon: finalBalance >= 0 ? '📈' : '📉',
                label: `${expectedLifeExpectancy}歳時点 予測総資産`,
                value: `${finalBalance >= 0 ? '+' : ''}${Utils.formatCurrency(finalBalance)}`,
                positive: finalBalance >= 0
            },
            {
                icon: '🏖️',
                label: `${retirementAge}歳時点 予測総資産`,
                value: `${retirementAssets >= 0 ? '+' : ''}${Utils.formatCurrency(retirementAssets)}`,
                positive: retirementAssets >= 0
            }
        ];

        container.innerHTML = cards.map(card => `
            <div class="result-card">
                <div class="result-icon">${card.icon}</div>
                <div class="result-label">${card.label}</div>
                <div class="result-value ${card.positive ? 'positive' : 'negative'}">${card.value}</div>
            </div>
        `).join('');
    },

    renderChart() {
        const ctx = Utils.getElement('lifetimeChart', false);
        if (!ctx) {
            console.error('Chart canvas not found');
            return;
        }

        // Chart.jsが読み込まれているかを確認
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            UIManager.updatePlaceholders(false);
            NotificationManager.show('グラフライブラリの読み込みに失敗しました', 'error');
            return;
        }

        const canvasCtx = ctx.getContext('2d');
        if (!canvasCtx) {
            console.error('Cannot get 2D context from canvas');
            return;
        }

        const data = appState.results.yearlyData;

        // 既存のチャートを安全に破棄
        if (lifetimeChart && typeof lifetimeChart.destroy === 'function') {
            try {
                lifetimeChart.destroy();
            } catch (error) {
                console.warn('Error destroying existing chart:', error);
            }
            lifetimeChart = null;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('Invalid chart data');
            UIManager.updatePlaceholders(false);
            return;
        }

        UIManager.updatePlaceholders(true);

        const datasets = [
            {
                label: '総資産（現金＋NISA）',
                data: data.map(d => d.totalAssets),
                borderColor: 'var(--color-primary-500)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.1,
                fill: true,
                pointBackgroundColor: 'var(--color-primary-500)',
                pointRadius: (ctx) => (ctx.dataIndex % 5 === 0 || ctx.dataIndex === data.length - 1) ? 4 : 0
            },
            {
                label: '現金残高',
                data: data.map(d => d.cumulativeCash),
                borderColor: 'var(--color-warning-500)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.1,
                fill: false,
                borderDash: [5, 5],
                pointBackgroundColor: 'var(--color-warning-500)',
                pointRadius: (ctx) => (ctx.dataIndex % 5 === 0 || ctx.dataIndex === data.length - 1) ? 3 : 0
            }
        ];

        // NISAが選択されている場合はデータセットに追加
        const nisaActive = appState.lifeEvents.nisa && appState.results.nisaFinalBalance > 0;
        if (nisaActive) {
            datasets.push({
                label: 'NISA評価額',
                data: data.map(d => d.nisaBalance),
                borderColor: 'var(--color-success-500)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.1,
                fill: false,
                borderDash: [2, 2],
                pointBackgroundColor: 'var(--color-success-500)',
                pointRadius: (ctx) => (ctx.dataIndex % 5 === 0 || ctx.dataIndex === data.length - 1) ? 3 : 0
            });

            // NISA凡例を表示
            const nisaLegend = document.querySelector('.nisa-legend');
            if (nisaLegend) nisaLegend.style.display = 'flex';
        }

        lifetimeChart = new Chart(canvasCtx, {
            type: 'line',
            data: {
                labels: data.map(d => d.age),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return Utils.formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '年齢'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += Utils.formatCurrency(context.parsed.y);
                                }
                                return label;
                            },
                            title: function(tooltipItems) {
                                return `${tooltipItems[0].label}歳時点`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    },

    renderAdvice() {
        const container = Utils.getElement('adviceContent', false);
        if (!container) return;

        container.innerHTML = '';

        const { results, basicInfo, fixedCosts, lifeEvents, advancedSettings, detailSettings } = appState;
        
        if (!results.yearlyData || results.yearlyData.length === 0) {
            UIManager.updatePlaceholders(false);
            return;
        }

        UIManager.updatePlaceholders(true);

        const adviceList = [];

        // 総合評価アドバイス
        this.addOverallAdvice(adviceList, results, advancedSettings);
        
        // 固定費アドバイス
        this.addFixedCostAdvice(adviceList, basicInfo, fixedCosts);
        
        // 投資アドバイス
        this.addInvestmentAdvice(adviceList, lifeEvents, detailSettings, results, advancedSettings);
        
        // ライフイベントアドバイス
        this.addLifeEventAdvice(adviceList, lifeEvents, detailSettings, advancedSettings, results);

        // アドバイスが空の場合のフォールバック
        if (adviceList.length === 0) {
            adviceList.push({
                text: '特に目立った課題はありませんが、定期的な見直しをおすすめします。',
                type: 'type-good'
            });
        }

        // アドバイスをレンダリング
        adviceList.forEach(advice => {
            const adviceElement = document.createElement('div');
            adviceElement.className = `advice-item ${advice.type}`;
            adviceElement.innerHTML = advice.text;
            container.appendChild(adviceElement);
        });
    },

    addOverallAdvice(adviceList, results, advancedSettings) {
        const retirementAssetsFormatted = Utils.formatCurrency(results.retirementAssets);
        const finalBalanceFormatted = Utils.formatCurrency(results.finalBalance);

        if (results.rating === 'S' || results.rating === 'A') {
            adviceList.push({
                text: `素晴らしい資産計画です！${advancedSettings.retirementAge}歳時点での資産は<strong>${retirementAssetsFormatted}</strong>、${advancedSettings.expectedLifeExpectancy}歳時点では<strong>${finalBalanceFormatted}</strong>と予測され、安定した未来が期待できます。`,
                type: 'type-good'
            });
        } else if (results.rating === 'B') {
            adviceList.push({
                text: `堅実な資産計画ですが、さらに余裕を持つために改善の余地があります。${advancedSettings.retirementAge}歳時点での資産は<strong>${retirementAssetsFormatted}</strong>、${advancedSettings.expectedLifeExpectancy}歳時点では<strong>${finalBalanceFormatted}</strong>です。`,
                type: 'type-info'
            });
        } else {
            adviceList.push({
                text: `<span class="warning">現在の計画では、将来の資金が不足する可能性があります。</span>${advancedSettings.retirementAge}歳時点での資産は<strong>${retirementAssetsFormatted}</strong>、${advancedSettings.expectedLifeExpectancy}歳時点では<strong>${finalBalanceFormatted}</strong>と予測されます。具体的な改善策を検討しましょう。`,
                type: 'type-warning'
            });
        }
    },

    addFixedCostAdvice(adviceList, basicInfo, fixedCosts) {
        const totalMonthlyFixedCosts = Object.values(fixedCosts)
            .reduce((sum, cost) => cost.isActive ? sum + cost.amount : sum, 0);
        
        const incomeRatio = basicInfo.income > 0 ? (totalMonthlyFixedCosts / basicInfo.income) * 100 : 0;

        if (incomeRatio > 50) {
            adviceList.push({
                text: `現在の固定費（月<strong>${totalMonthlyFixedCosts.toFixed(1)}万円</strong>）は収入の<strong>${incomeRatio.toFixed(0)}%</strong>を占めており、<span class="warning">やや高めです。</span>特に大きな割合を占める項目（例：住居費、食費、自動車関連費）から見直してみましょう。`,
                type: 'type-warning'
            });
        } else if (incomeRatio > 30) {
            adviceList.push({
                text: `固定費（月<strong>${totalMonthlyFixedCosts.toFixed(1)}万円</strong>）は収入の<strong>${incomeRatio.toFixed(0)}%</strong>です。理想は30%以下ですが、ライフスタイルに合わせて無理のない範囲で削減を検討するのも良いでしょう。`,
                type: 'type-info'
            });
        }
    },

    addInvestmentAdvice(adviceList, lifeEvents, detailSettings, results, advancedSettings) {
        if (lifeEvents.nisa && detailSettings.nisaAmount > 0) {
            const nisaFinalBalanceFormatted = Utils.formatCurrency(results.nisaFinalBalance);
            adviceList.push({
                text: `NISA等での積立投資（月<strong>${detailSettings.nisaAmount.toFixed(1)}万円</strong>、期待利回り年<strong>${advancedSettings.investmentReturnRate}%</strong>）は、将来の資産形成に大きく貢献します。最終的なNISA評価額は<strong>${nisaFinalBalanceFormatted}</strong>に達する見込みです。<span class="improvement">可能であれば積立額の増額や、より効率的な運用方法も検討しましょう。</span>`,
                type: 'type-good'
            });

            if (advancedSettings.investmentReturnRate < 2 && results.nisaFinalBalance > 0) {
                adviceList.push({
                    text: `現在の期待利回り(年<strong>${advancedSettings.investmentReturnRate}%</strong>)はやや保守的です。リスク許容度に応じて、もう少し高いリターンを目指せる投資戦略も検討の余地があります。`,
                    type: 'type-info'
                });
            }
        } else {
            adviceList.push({
                text: `現在、NISAなどの積立投資は計画に含まれていません。少額からでも始めることで、複利の効果を活かして将来の資産を増やすことが期待できます。<span class="improvement">月1万円からでも検討してみましょう。</span>`,
                type: 'type-info'
            });
        }
    },

    addLifeEventAdvice(adviceList, lifeEvents, detailSettings, advancedSettings, results) {
        // 早期リタイアのアドバイス
        if (advancedSettings.retirementAge < 65 && results.finalBalance < 0) {
            adviceList.push({
                text: `早期リタイア（<strong>${advancedSettings.retirementAge}歳</strong>）を希望されていますが、現状では資金が不足する可能性があります。リタイア時期を少し遅らせるか、収入増・支出減・投資強化を検討しましょう。`,
                type: 'type-warning'
            });
        }

        // 住宅購入のアドバイス
        if (lifeEvents.housing && detailSettings.housingAge) {
            const housingEventConfig = APP_DATA.lifeEvents.find(e => e.key === 'housing');
            if (housingEventConfig) {
                const housingCostFormatted = Utils.formatCurrency(housingEventConfig.cost);
                adviceList.push({
                    text: `住宅購入（<strong>${detailSettings.housingAge}歳</strong>、費用<strong>${housingCostFormatted}</strong>）は大きな支出です。頭金の準備やローン計画をしっかり立てることが重要です。`,
                    type: 'type-info'
                });
            }
        }
    }
};

// ===== アプリケーション初期化 =====
const AppInitializer = {
    checkBrowserSupport() {
        const features = {
            localStorage: typeof(Storage) !== "undefined",
            canvas: !!document.createElement("canvas").getContext,
            es6: typeof Symbol !== "undefined"
        };
        const unsupported = Object.entries(features)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);
        if (unsupported.length > 0) {
            console.warn("Unsupported features:", unsupported);
            NotificationManager.show(`お使いのブラウザは一部機能に対応していません。最新版への更新をお勧めします。`, "warning");
        }
        return unsupported.length === 0;
    },
    async init() {
        try {
            console.log('アプリケーション初期化開始');
            if (!this.checkBrowserSupport()) {
                console.warn("Unsupported browser features detected");
            }
            
            // データ読み込み
            await this.loadData();
            
            // バリデーションルール設定
            ValidationManager.setupValidationRules();
            
            // UI初期化
            this.initializeUI();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // フォーム復元
            FormManager.restoreFormData();
            
            // 初期表示更新
            this.updateInitialDisplay();
            
            console.log('アプリケーション初期化完了');
            
        } catch (error) {
            Utils.handleError(error, 'Application initialization');
        }
    },

    async loadData() {
        const savedData = StorageManager.load();
        if (savedData) {
            // 保存されたデータをappStateにマージ
            Object.assign(appState, {
                currentStep: savedData.currentStep || 1,
                farthestValidatedStep: savedData.farthestValidatedStep || 1,
                basicInfo: { ...appState.basicInfo, ...savedData.basicInfo },
                fixedCosts: { ...appState.fixedCosts, ...savedData.fixedCosts },
                lifeEvents: { ...appState.lifeEvents, ...savedData.lifeEvents },
                customLifeEvents: Array.isArray(savedData.customLifeEvents) ? savedData.customLifeEvents : [],
                detailSettings: { ...appState.detailSettings, ...savedData.detailSettings },
                advancedSettings: { ...APP_DATA.defaultAdvancedSettings, ...savedData.advancedSettings },
                results: savedData.results || {}
            });
        }
    },

    initializeUI() {
        // 誕生日セレクト設定
        FormManager.setupBirthdaySelects();
        
        // 年金入力設定
        PensionManager.setupInputs();
        
        // 固定費レンダリング
        FixedCostManager.render();
        
        // ライフイベントレンダリング
        LifeEventManager.render();
        
        // カスタムライフイベント設定
        CustomEventManager.setup();
        
        // プレースホルダー表示状態設定
        UIManager.updatePlaceholders(false);
    },

    setupEventListeners() {
        // 基本情報のイベントリスナー
        this.setupBasicInfoListeners();
        
        // ナビゲーションのイベントリスナー
        this.setupNavigationListeners();
        
        // 詳細設定のイベントリスナー
        this.setupAdvancedSettingsListeners();
        
        // グローバルイベントリスナー
        this.setupGlobalListeners();
    },

    setupBasicInfoListeners() {
        const incomeInput = Utils.getElement('income', false);
        if (incomeInput) {
            incomeInput.addEventListener('input', () => {
                Utils.debounce('updateIncome', () => {
                    appState.basicInfo.income = Utils.parseNumber(incomeInput.value, null, 5, 300);
                    PensionManager.calculate();
                    FixedCostManager.updateSummary();
                    UIManager.clearError('income');
                    FormManager.autoSave();
                });
            });
        }

        const occupationSelect = Utils.getElement('occupation', false);
        if (occupationSelect) {
            occupationSelect.addEventListener('change', () => {
                appState.basicInfo.occupation = occupationSelect.value;
                const age = Utils.calculateAge(appState.basicInfo.birthday);
                if (age !== null) {
                    PensionManager.adjustByAge(age);
                }
                UIManager.clearError('occupation');
                FormManager.autoSave();
            });
        }
    },

    setupNavigationListeners() {
        // ステップラベルのクリック
        document.querySelectorAll('.step-label').forEach(label => {
            label.addEventListener('click', () => {
                const targetStep = parseInt(label.dataset.step);
                NavigationManager.goToStep(targetStep);
            });
        });

        // グローバル関数の設定（HTMLから呼び出される）
        window.nextStep = () => NavigationManager.nextStep();
        window.prevStep = () => NavigationManager.previousStep();
        window.calculateResults = () => CalculationEngine.calculate();
        window.resetApp = () => this.resetApplication();
        window.exportResults = () => this.exportResults();
        window.downloadChartImage = () => AppInitializer.downloadChartImage();
        window.shareResults = () => AppInitializer.shareResults();
        window.saveSettings = () => {
            if (StorageManager.save(appState)) {
                NotificationManager.show('設定を保存しました', 'success');
            }
        };
        window.scrollToAdvice = () => {
            const adviceSection = document.querySelector('.advice-section');
            if (adviceSection) {
                Utils.scrollToElement(adviceSection, 100);
            }
        };
        window.closeQuickGuide = () => UIManager.closeQuickGuide();
    },

    setupAdvancedSettingsListeners() {
        const advancedFields = ['retirementAge', 'expectedLifeExpectancy', 'investmentReturnRate'];
        
        advancedFields.forEach(fieldId => {
            const element = Utils.getElement(fieldId, false);
            if (element) {
                element.addEventListener('change', () => {
                    const value = Utils.parseNumber(element.value);
                    appState.advancedSettings[fieldId] = value;
                    
                    // 退職年齢変更時は年金設定も更新
                    if (fieldId === 'retirementAge') {
                        const age = Utils.calculateAge(appState.basicInfo.birthday);
                        if (age !== null) {
                            PensionManager.adjustByAge(age);
                        }
                    }
                    
                    UIManager.clearError(fieldId);
                    FormManager.autoSave();
                });
            }
        });

        // ライフイベント詳細設定
        const detailFields = [
            { id: 'childrenCount', key: 'childrenCount' },
            { id: 'housingAge', key: 'housingAge' },
            { id: 'nisaAmount', key: 'nisaAmount' }
        ];

        detailFields.forEach(field => {
            const element = Utils.getElement(field.id, false);
            if (element) {
                element.addEventListener('input', () => {
                    Utils.debounce(`update_${field.key}`, () => {
                        let value = Utils.parseNumber(element.value);
                        if (field.key === 'childrenCount' || field.key === 'housingAge') {
                            value = Utils.parseInt(element.value);
                        }
                        
                        appState.detailSettings[field.key] = value;
                        UIManager.clearError(field.id);
                        FormManager.autoSave();
                    });
                });
            }
        });
    },

    setupGlobalListeners() {
        // ページ離脱時の自動保存
        window.addEventListener('beforeunload', () => {
            if (!appState.isCalculating) {
                FormManager.saveCurrentStepData();
            }
        });

        // ページの可視性変更時の保存
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && !appState.isCalculating) {
                FormManager.saveCurrentStepData();
            }
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // Ctrl+S で保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                FormManager.saveCurrentStepData();
                NotificationManager.show('データを保存しました', 'success', 2000);
            }
            
            // ESC でフォームキャンセル
            if (e.key === 'Escape') {
                const customEventForm = Utils.getElement('customEventFormContainer', false);
                if (customEventForm && customEventForm.style.display === 'block') {
                    CustomEventManager.hideForm();
                }
            }
        });

        // エラーハンドリング
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            Utils.handleError(e.error, 'Global error handler');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            Utils.handleError(e.reason, 'Unhandled promise rejection');
        });
    },

    updateInitialDisplay() {
        // ステップ表示更新
        UIManager.showStep(appState.currentStep);
        
        // 年金計算実行
        setTimeout(() => {
            PensionManager.calculate();
        }, 100);
        
        // 固定費サマリー更新
        FixedCostManager.updateSummary();
        
        UIManager.showQuickGuide();
        // ライフイベント詳細設定の可視性更新
        LifeEventManager.updateDetailSettingsVisibility();
    },

    resetApplication() {
        if (!confirm('入力内容をすべてリセットして最初からやり直しますか？\n\n※この操作は取り消せません。')) {
            return;
        }

        try {
            // ローカルストレージクリア
            StorageManager.clear();
            
            // アプリケーション状態リセット
            appState = new AppState();
            
            // チャート破棄
            if (lifetimeChart) {
                lifetimeChart.destroy();
                lifetimeChart = null;
            }
            
            // フォームリセット
            this.resetAllForms();
            
            // UIリセット
            this.resetUI();
            
            // 初期表示に戻る
            appState.currentStep = 1;
            appState.farthestValidatedStep = 1;
            UIManager.showStep(1);
            
            // データ再初期化
            this.initializeUI();
            FormManager.restoreFormData();
            
            NotificationManager.show('データをリセットしました', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'Application reset');
        }
    },

    resetAllForms() {
        // 全ての入力フィールドをリセット
        document.querySelectorAll('input[type="number"], input[type="text"], select').forEach(input => {
            if (APP_DATA.defaultAdvancedSettings.hasOwnProperty(input.id)) {
                input.value = APP_DATA.defaultAdvancedSettings[input.id];
            } else if (input.id in appState.detailSettings) {
                input.value = appState.detailSettings[input.id];
            } else {
                input.value = '';
            }
            
            input.classList.remove('error');
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });

        // エラーメッセージをクリア
        document.querySelectorAll('.input-error-message').forEach(el => {
            el.style.display = 'none';
        });

        // ガイダンスメッセージをクリア
        document.querySelectorAll('.pension-guidance-message').forEach(el => {
            el.style.display = 'none';
        });
    },

    resetUI() {
        // 表示要素のリセット
        const elementsToHide = [
            'ageDisplay', 'pensionEstimate', 'customEventFormContainer'
        ];
        
        elementsToHide.forEach(id => {
            const element = Utils.getElement(id, false);
            if (element) element.style.display = 'none';
        });

        // ボタン表示状態のリセット
        const addButton = Utils.getElement('addCustomEventButton', false);
        if (addButton) addButton.style.display = 'inline-flex';

        // プレースホルダー表示
        UIManager.updatePlaceholders(false);

        // 固定費比率アドバイスのリセット
        const ratioAdvice = Utils.getElement('ratioAdvice', false);
        if (ratioAdvice) {
            ratioAdvice.textContent = '';
            ratioAdvice.className = 'ratio-advice';
        }
    },

    exportResults() {
        try {
            if (!appState.results.yearlyData || appState.results.yearlyData.length === 0) {
                NotificationManager.show('まずシミュレーションを実行してください', 'error');
                return;
            }

            const exportData = this.generateExportData();

            // PDFとJSONの両方を提供
            const choice = confirm('結果をエクスポートします。\n\n「OK」= PDF形式（印刷プレビュー）\n「キャンセル」= JSON形式（データファイル）');

            if (choice) {
                this.downloadExportPDF(exportData);
            } else {
                this.downloadExportData(exportData);
            }

        } catch (error) {
            Utils.handleError(error, 'Results export');
        }
    },

    generateExportData() {
        const currentAge = Utils.calculateAge(appState.basicInfo.birthday);
        
        return {
            シミュレーション実行日時: new Date().toLocaleString('ja-JP'),
            評価: appState.results.rating,
            入力情報: {
                基本: {
                    生年月日: appState.basicInfo.birthday,
                    現在年齢: `${currentAge !== null ? currentAge : '--'}歳`,
                    月の手取り収入: `${appState.basicInfo.income !== null ? appState.basicInfo.income : '--'}万円`,
                    職業: this.getOccupationText(appState.basicInfo.occupation),
                    国民年金実績: `${appState.basicInfo.nationalPension実績Years}年`,
                    国民年金予定: `${appState.basicInfo.nationalPension予定Years}年`,
                    厚生年金実績: `${appState.basicInfo.employeePension実績Years}年`,
                    厚生年金予定: `${appState.basicInfo.employeePension予定Years}年`
                },
                固定費: this.getFixedCostsText(),
                ライフイベント: this.getLifeEventsText(),
                その他の大きな支出: this.getCustomEventsText(),
                詳細設定: {
                    リタイア希望年齢: `${appState.advancedSettings.retirementAge}歳`,
                    想定寿命: `${appState.advancedSettings.expectedLifeExpectancy}歳`,
                    期待運用利回り: `${appState.advancedSettings.investmentReturnRate}%`
                }
            },
            予測結果: {
                生涯総収入: Utils.formatCurrency(appState.results.totalIncome),
                生涯総支出: Utils.formatCurrency(appState.results.totalExpenses),
                [`${appState.advancedSettings.expectedLifeExpectancy}歳時点総資産`]: Utils.formatCurrency(appState.results.finalBalance),
                [`${appState.advancedSettings.retirementAge}歳時点総資産`]: Utils.formatCurrency(appState.results.retirementAssets),
                NISA最終評価額: Utils.formatCurrency(appState.results.nisaFinalBalance)
            },
            アドバイスの要約: this.getAdviceSummary(),
            年間データ: appState.results.yearlyData.map(d => ({
                年齢: d.age,
                総資産: `${d.totalAssets.toFixed(1)}万円`,
                現金: `${d.cumulativeCash.toFixed(1)}万円`,
                NISA: `${d.nisaBalance.toFixed(1)}万円`,
                年間収入: `${d.income.toFixed(1)}万円`,
                年間支出: `${d.cashExpense.toFixed(1)}万円`
            }))
        };
    },

    getOccupationText(key) {
        const occupationSelect = Utils.getElement('occupation', false);
        if (!occupationSelect) return key;
        
        const option = Array.from(occupationSelect.options).find(opt => opt.value === key);
        return option ? option.textContent : key;
    },

    getFixedCostsText() {
        const activeCosts = Object.entries(appState.fixedCosts)
            .filter(([_, cost]) => cost.isActive)
            .map(([id, cost]) => {
                const category = APP_DATA.categories.find(c => c.id === id);
                return `${category?.name}: ${cost.amount}万円`;
            });
        
        return activeCosts.length > 0 ? activeCosts.join('、') : '入力なし';
    },

    getLifeEventsText() {
        const activeEvents = Object.entries(appState.lifeEvents)
            .filter(([_, isActive]) => isActive)
            .map(([key, _]) => {
                const eventConfig = APP_DATA.lifeEvents.find(e => e.key === key);
                let eventText = eventConfig ? eventConfig.text : key;
                
                if (eventConfig?.hasDetail) {
                    if (key === 'children') {
                        eventText += ` (${appState.detailSettings.childrenCount}人)`;
                    } else if (key === 'housing') {
                        eventText += ` (${appState.detailSettings.housingAge}歳購入)`;
                    } else if (key === 'nisa') {
                        eventText += ` (月${appState.detailSettings.nisaAmount}万円)`;
                    }
                }
                
                return eventText;
            });
        
        return activeEvents.length > 0 ? activeEvents.join('、') : '選択なし';
    },

    getCustomEventsText() {
        if (appState.customLifeEvents.length === 0) return 'なし';
        
        return appState.customLifeEvents
            .map(e => `${e.name}: ${e.amount}万円 (${e.age}歳時)`)
            .join('、');
    },

    getAdviceSummary() {
        const adviceContent = Utils.getElement('adviceContent', false);
        if (!adviceContent) return 'アドバイスが生成されていません';
        
        return adviceContent.innerText
            .replace(/\n\n/g, '\n')
            .substring(0, 500) + '...';
    },

    downloadExportData(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `生涯収支シミュレーション結果_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        NotificationManager.show('結果をJSONファイルとしてエクスポートしました', 'success');
    },

    downloadExportPDF(data) {
        try {
            // ブラウザの印刷機能を使用したPDF生成
            this.createPrintablePage(data);
        } catch (error) {
            console.error('PDF export error:', error);
            NotificationManager.show('PDFの生成に失敗しました。代わりにJSONファイルをダウンロードします', 'warning');
            this.downloadExportData(data);
        }
    },

    // 新しいメソッドを追加
    createPrintablePage(data) {
        const printWindow = window.open('', '_blank');
        const currentAge = Utils.calculateAge(appState.basicInfo.birthday);

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>人生おかね診断結果</title>
            <style>
                body {
                    font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', sans-serif;
                    line-height: 1.6;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #1d4ed8;
                    border-left: 4px solid #2563eb;
                    padding-left: 10px;
                    margin-bottom: 15px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .info-item {
                    background: #f8fafc;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .info-label {
                    font-weight: bold;
                    color: #475569;
                    font-size: 14px;
                }
                .info-value {
                    color: #1e293b;
                    font-size: 16px;
                }
                .result-highlight {
                    background: #eff6ff;
                    border: 2px solid #3b82f6;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                }
                .rating {
                    font-size: 36px;
                    font-weight: bold;
                    color: #1d4ed8;
                    margin-bottom: 10px;
                }
                .amount {
                    font-size: 24px;
                    font-weight: bold;
                    color: #059669;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">💰 人生おかね診断結果</div>
                <div>実行日時: ${new Date().toLocaleString('ja-JP')}</div>
            </div>

            <div class="result-highlight">
                <div class="rating">評価: ${appState.results.rating}ランク</div>
                <div class="amount">${appState.advancedSettings.expectedLifeExpectancy}歳時点予測総資産: ${Utils.formatCurrency(appState.results.finalBalance)}</div>
            </div>

            <div class="section">
                <div class="section-title">📋 基本情報</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">現在年齢</div>
                        <div class="info-value">${currentAge !== null ? currentAge + '歳' : '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">月の手取り収入</div>
                        <div class="info-value">${appState.basicInfo.income !== null ? appState.basicInfo.income + '万円' : '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">職業</div>
                        <div class="info-value">${this.getOccupationText(appState.basicInfo.occupation)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">リタイア希望年齢</div>
                        <div class="info-value">${appState.advancedSettings.retirementAge}歳</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">💰 予測結果</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">生涯総収入</div>
                        <div class="info-value">${Utils.formatCurrency(appState.results.totalIncome)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">生涯総支出</div>
                        <div class="info-value">${Utils.formatCurrency(appState.results.totalExpenses)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">${appState.advancedSettings.retirementAge}歳時点総資産</div>
                        <div class="info-value">${Utils.formatCurrency(appState.results.retirementAssets)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">NISA最終評価額</div>
                        <div class="info-value">${Utils.formatCurrency(appState.results.nisaFinalBalance)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🎯 ライフイベント</div>
                <div class="info-value">${this.getLifeEventsText()}</div>
            </div>

            <div class="section">
                <div class="section-title">💸 その他の大きな支出</div>
                <div class="info-value">${this.getCustomEventsText()}</div>
            </div>

            <div class="footer">
                <p>※ この結果は概算値であり、実際の収支と異なる場合があります</p>
                <p>※ 定期的な見直しと専門家への相談をお勧めします</p>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    📄 PDFとして保存
                </button>
                <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                    閉じる
                </button>
            </div>
        </body>
        </html>`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // ページが読み込まれた後に印刷ダイアログを表示
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };

        NotificationManager.show('印刷画面を開きました。PDFとして保存してください', 'success');
    },

    downloadChartImage() {
        try {
            const canvas = Utils.getElement('lifetimeChart', false);
            if (!canvas || !lifetimeChart) {
                NotificationManager.show('まずシミュレーションを実行してください', 'error');
                return;
            }

            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `生涯収支グラフ_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            NotificationManager.show('グラフ画像をダウンロードしました', 'success');
        } catch (error) {
            Utils.handleError(error, 'Chart image download');
        }
    },

    shareResults() {
        try {
            if (!appState.results.yearlyData || appState.results.yearlyData.length === 0) {
                NotificationManager.show('まずシミュレーションを実行してください', 'error');
                return;
            }

            const url = window.location.href;
            const balance = Utils.formatCurrency(appState.results.finalBalance);
            const text = `人生おかね診断の結果は${balance}でした！`;

            if (navigator.share) {
                navigator.share({
                    title: '人生おかね診断',
                    text,
                    url
                }).catch(err => console.error('Share failed', err));
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(`${text} ${url}`).then(() => {
                    NotificationManager.show('共有リンクをコピーしました', 'success');
                }).catch(err => {
                    console.error('Clipboard write failed', err);
                    NotificationManager.show('共有に失敗しました', 'error');
                });
            } else {
                NotificationManager.show('このブラウザでは共有機能がサポートされていません', 'error');
            }
        } catch (error) {
            Utils.handleError(error, 'Share results');
        }
    }
};

// Expose ResultsManager in the global scope for inline event handlers
if (typeof window !== 'undefined') {
    window.ResultsManager = ResultsManager;
}

// ===== デバッグ用ユーティリティ =====
if (typeof window !== 'undefined') {
    // デバッグ用のグローバル関数
    window.debugAppState = () => {
        console.log('Current App State:', JSON.parse(JSON.stringify(appState)));
    };
    
    window.forceStep = (stepNumber) => {
        if (stepNumber > 0 && stepNumber <= 5) {
            appState.currentStep = stepNumber;
            appState.farthestValidatedStep = Math.max(appState.farthestValidatedStep, stepNumber);
            UIManager.showStep(stepNumber);
            console.log(`Forced to step ${stepNumber}`);
        }
    };
    
    window.clearLocalStorage = () => {
        StorageManager.clear();
        console.log('Local storage cleared');
    };
    
    window.simulateCalculation = () => {
        CalculationEngine.calculate();
    };
}

// ===== アプリケーション開始 =====
document.addEventListener('DOMContentLoaded', function() {
    AppInitializer.init().catch(error => {
        console.error('Failed to initialize application:', error);
        NotificationManager.show('アプリケーションの初期化に失敗しました', 'error');
    });
});

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        Utils,
        NotificationManager,
        ValidationManager,
        StorageManager,
        UIManager,
        FormManager,
        PensionManager,
        FixedCostManager,
        LifeEventManager,
        CustomEventManager,
        StepValidator,
        NavigationManager,
        CalculationEngine,
        ResultsManager,
        AppInitializer
    };
}