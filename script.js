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
    },
    personalityTypes: {
        security: {
            name: "安定重視型",
            description: "将来の安心と安定を最優先する",
            keywords: ["安心", "安定", "盤石", "確実", "堅実"]
        },
        growth: {
            name: "自己投資型",
            description: "スキルアップやキャリア形成への投資を重視する",
            keywords: ["成長", "スキルアップ", "キャリア", "向上", "発展"]
        },
        freedom: {
            name: "現在志向型",
            description: "今の楽しみや体験を大切にする",
            keywords: ["自由", "体験", "楽しみ", "今", "充実"]
        },
        contribution: {
            name: "貢献・家族型",
            description: "家族や大切な人との時間、社会貢献を重視する",
            keywords: ["家族", "貢献", "大切な人", "絆", "支え合い"]
        }
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
        this.financialPersonality = null;
    }
}

// ===== グローバル変数 =====
let appState = new AppState();
let lifetimeChart = null;
let debounceTimers = new Map();
let currentNotificationId = 0;

// ===== ユーティリティ関数 =====
const Utils = {
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
    getElement(id, required = true) {
        const element = document.getElementById(id);
        if (!element && required) {
            console.error(`Required element not found: ${id}`);
            return null;
        }
        return element;
    },
    parseNumber(value, defaultValue = 0, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },
    parseInt(value, defaultValue = 0, min = -Infinity, max = Infinity) {
        const num = parseInt(value, 10);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },
    preciseAdd(a, b) {
        const factor = 100;
        return (Math.round(a * factor) + Math.round(b * factor)) / factor;
    },
    preciseMultiply(a, b) {
        const factor = 100;
        return (Math.round(a * factor) * b) / factor;
    },
    precisePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 1000) / 10;
    },
    calculateAge(birthDate) {
        if (!birthDate) return null;
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            if (isNaN(birth.getTime())) return null;
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return Math.max(0, age);
        } catch (e) {
            return null;
        }
    },
    formatCurrency(amount, unit = '万円') {
        if (typeof amount !== 'number' || isNaN(amount)) return '---';
        if (Math.abs(amount) >= 10000) {
            return `${(amount / 10000).toFixed(1)}億${unit.replace('万', '')}`;
        }
        return `${Math.round(amount).toLocaleString()}${unit}`;
    },
    generateId() {
        return `_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
    },
    scrollToElement(element, offset = 0) {
        if (!element) return;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth'
        });
    },
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        NotificationManager.show('予期しないエラーが発生しました。', 'error');
    }
};

// ===== 通知管理システム =====
const NotificationManager = {
    show(message, type = 'info', duration = APP_CONFIG.NOTIFICATION_DURATION) {
        const existingNotification = document.querySelector('.notification');
        if(existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.setAttribute('role', 'alert');

        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

        notification.innerHTML = `<span class="notification-icon">${icons[type]}</span> ${message}`;
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '8px',
            color: 'white', background: colors[type], zIndex: '10000', transform: 'translateX(120%)',
            opacity: '0', transition: 'all 0.4s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        });
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }
};

// ===== ストレージ管理 =====
const StorageManager = {
    save(data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(APP_CONFIG.STORAGE_KEY, serializedData);
        } catch (e) {
            console.error("Error saving to localStorage", e);
            NotificationManager.show("設定の保存に失敗しました。", "error");
        }
    },
    load() {
        try {
            const data = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Error loading from localStorage", e);
            localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
            return null;
        }
    },
    clear() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
    }
};


// ===== UI管理システム =====
const UIManager = {
    updateProgress() {
        const percentage = appState.currentStep * 20;
        Utils.getElement('progressFill').style.width = `${percentage}%`;
        Utils.getElement('progressPercentage').textContent = `${percentage}%`;
        Utils.getElement('progressSummary').textContent = `ステップ ${appState.currentStep} / 5 を入力中`;
        this.updateStepLabels();
        this.updateMainSteps();
    },
    updateMainSteps() {
        const phaseMap = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3 };
        const currentPhase = phaseMap[appState.currentStep] || 1;
        document.querySelectorAll('.main-step').forEach((step, index) => {
            step.classList.toggle('active', index === currentPhase - 1);
        });
    },
    updateStepLabels() {
        document.querySelectorAll('.step-label').forEach(label => {
            const stepNum = Utils.parseInt(label.dataset.step);
            label.classList.remove('active', 'completed');
            label.disabled = stepNum > appState.farthestValidatedStep;
            if (stepNum === appState.currentStep) label.classList.add('active');
            else if (stepNum < appState.currentStep) label.classList.add('completed');
        });
    },
    showStep(stepNumber) {
        document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
        Utils.getElement(`step${stepNumber}`).classList.add('active');
        appState.currentStep = stepNumber;
        this.updateProgress();
    },
    showError(elementId, message) {
        const errorElement = Utils.getElement(`${elementId}Error`, false);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        const inputElement = Utils.getElement(elementId, false);
        if (inputElement) inputElement.classList.add('error');
    },
    clearError(elementId) {
        const errorElement = Utils.getElement(`${elementId}Error`, false);
        if (errorElement) errorElement.style.display = 'none';
        const inputElement = Utils.getElement(elementId, false);
        if (inputElement) inputElement.classList.remove('error');
    },
    showLoading() {
        Utils.getElement('loadingAnimation').classList.add('active');
    },
    hideLoading() {
        Utils.getElement('loadingAnimation').classList.remove('active');
    },
    updatePlaceholders(showResults = false) {
        Utils.getElement('chartPlaceholder').style.display = showResults ? 'none' : 'flex';
        Utils.getElement('lifetimeChart').style.display = showResults ? 'block' : 'none';
        Utils.getElement('advicePlaceholder').style.display = showResults ? 'none' : 'flex';
        Utils.getElement('adviceContent').style.display = showResults ? 'grid' : 'none';
    },
    showQuickGuide() {
        const overlay = Utils.getElement("quickGuideOverlay", false);
        if (overlay && !localStorage.getItem("guideShown")) {
            overlay.style.display = "flex";
        }
    },
    closeQuickGuide() {
        const overlay = Utils.getElement("quickGuideOverlay", false);
        if (overlay) overlay.style.display = "none";
        localStorage.setItem("guideShown", "1");
    }
};

// ===== フォーム管理システム =====
const FormManager = {
    setupBirthdaySelects() {
        const yearSelect = Utils.getElement('birthYear');
        const monthSelect = Utils.getElement('birthMonth');
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 18; y >= currentYear - 80; y--) yearSelect.add(new Option(`${y}年`, y));
        for (let m = 1; m <= 12; m++) monthSelect.add(new Option(`${m}月`, m));
        [yearSelect, monthSelect].forEach(el => el.addEventListener('change', () => this.updateAgeDisplay()));
    },
    updateAgeDisplay() {
        UIManager.clearError('birthDate');
        const year = Utils.getElement('birthYear').value;
        const month = Utils.getElement('birthMonth').value;
        const ageDisplay = Utils.getElement('ageDisplay');
        if (year && month) {
            const birthDate = new Date(year, month - 1, 1);
            const age = Utils.calculateAge(birthDate);
            if (age !== null) {
                Utils.getElement('currentAge').textContent = age;
                ageDisplay.style.display = 'block';
                appState.basicInfo.birthday = birthDate.toISOString().split('T')[0];
                PensionManager.adjustByAge(age);
            }
        } else {
            ageDisplay.style.display = 'none';
        }
        this.autoSave();
    },
    restoreFormData() {
        if (appState.financialPersonality) {
            const radio = document.querySelector(`input[name="financialPersonality"][value="${appState.financialPersonality}"]`);
            if (radio) radio.checked = true;
        }
        if (appState.basicInfo.birthday) {
            const d = new Date(appState.basicInfo.birthday);
            Utils.getElement('birthYear').value = d.getFullYear();
            Utils.getElement('birthMonth').value = d.getMonth() + 1;
            this.updateAgeDisplay();
        }
        Utils.getElement('income').value = appState.basicInfo.income;
        Utils.getElement('occupation').value = appState.basicInfo.occupation;
        
        Object.keys(appState.basicInfo).forEach(key => {
            if (key.includes('Pension')) {
                const el = Utils.getElement(key, false);
                if(el) el.value = appState.basicInfo[key];
                const slider = Utils.getElement(key.replace('Years', 'Slider'), false);
                if(slider) slider.value = appState.basicInfo[key];
            }
        });
        PensionManager.calculate();

        FixedCostManager.render();
        LifeEventManager.render();
        CustomEventManager.render();
        
        Object.keys(appState.advancedSettings).forEach(key => {
            const el = Utils.getElement(key, false);
            if (el) el.value = appState.advancedSettings[key];
        });

        Object.keys(appState.detailSettings).forEach(key => {
            const el = Utils.getElement(key, false);
            if (el) el.value = appState.detailSettings[key];
        });

        if (appState.results && appState.results.yearlyData && appState.results.yearlyData.length > 0) {
            UIManager.showStep(5);
            ResultsManager.render();
            UIManager.updatePlaceholders(true);
        }
    },
    autoSave() {
        Utils.debounce('autoSave', () => StorageManager.save(appState), 500);
    },
    saveCurrentStepData() {
        switch (appState.currentStep) {
            case 1: this.saveBasicInfo(); break;
            case 2: FixedCostManager.updateCosts(); break;
            case 3: this.saveLifeEvents(); break;
            case 4: this.saveAdvancedSettings(); break;
        }
        this.autoSave();
    },
    saveBasicInfo() {
        const personalityRadio = document.querySelector('input[name="financialPersonality"]:checked');
        appState.financialPersonality = personalityRadio ? personalityRadio.value : null;
        appState.basicInfo.income = Utils.parseNumber(Utils.getElement('income').value, null);
        appState.basicInfo.occupation = Utils.getElement('occupation').value;
    },
    saveLifeEvents() {
        if (appState.lifeEvents.children) appState.detailSettings.childrenCount = Utils.parseInt(Utils.getElement('childrenCount').value, 1);
        if (appState.lifeEvents.housing) appState.detailSettings.housingAge = Utils.parseInt(Utils.getElement('housingAge').value, 35);
        if (appState.lifeEvents.nisa) appState.detailSettings.nisaAmount = Utils.parseNumber(Utils.getElement('nisaAmount').value, 3.3);
    },
    saveAdvancedSettings() {
        appState.advancedSettings.retirementAge = Utils.parseInt(Utils.getElement('retirementAge').value, 65);
        appState.advancedSettings.expectedLifeExpectancy = Utils.parseInt(Utils.getElement('expectedLifeExpectancy').value, 95);
        appState.advancedSettings.investmentReturnRate = Utils.parseNumber(Utils.getElement('investmentReturnRate').value, 3.0);
    }
};

// ===== 年金管理システム =====
const PensionManager = {
    setupInputs() {
        const fields = ['nationalPension実績', 'nationalPension予定', 'employeePension実績', 'employeePension予定'];
        fields.forEach(field => {
            const slider = Utils.getElement(`${field}Slider`);
            const input = Utils.getElement(`${field}Years`);
            slider.addEventListener('input', () => { input.value = slider.value; this.handleInput(field, slider.value); });
            input.addEventListener('input', () => { slider.value = input.value; this.handleInput(field, input.value); });
        });
        document.querySelectorAll('.pension-years-stepper').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                const step = Utils.parseInt(e.currentTarget.dataset.step);
                const input = Utils.getElement(targetId);
                const newValue = Utils.parseInt(input.value) + step;
                if (newValue >= input.min && newValue <= input.max) {
                    input.value = newValue;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
    },
    handleInput(field, value) {
        appState.basicInfo[`${field}Years`] = Utils.parseInt(value);
        Utils.debounce('calculatePension', () => this.calculate(), 500);
        FormManager.autoSave();
    },
    adjustByAge(age) {
        const npFuture = Utils.getElement('nationalPension予定Years');
        const epFuture = Utils.getElement('employeePension予定Years');
        const retirementAge = appState.advancedSettings.retirementAge;

        npFuture.max = Math.max(0, 60 - age);
        npFuture.value = Math.min(Utils.parseInt(npFuture.value), npFuture.max);
        
        epFuture.max = Math.max(0, retirementAge - age);
        epFuture.value = Math.min(Utils.parseInt(epFuture.value), epFuture.max);
        
        this.calculate();
    },
    calculate() {
        const npYears = (appState.basicInfo.nationalPension実績Years || 0) + (appState.basicInfo.nationalPension予定Years || 0);
        const epYears = (appState.basicInfo.employeePension実績Years || 0) + (appState.basicInfo.employeePension予定Years || 0);
        const income = appState.basicInfo.income || 0;

        const npAmount = (816000 / 12) * (Math.min(npYears, 40) / 40);
        const avgReward = Math.min(Math.max(income * 1.35, 8.8), 65) * 10000;
        const epAmount = (epYears > 0 && income > 0) ? (avgReward * (5.481 / 1000) * (epYears * 12)) / 12 : 0;

        Utils.getElement('nationalPensionAmount').textContent = `${Math.round(npAmount).toLocaleString()}円`;
        Utils.getElement('employeePensionAmount').textContent = `${Math.round(epAmount).toLocaleString()}円`;
        Utils.getElement('totalPensionAmount').textContent = `${Math.round(npAmount + epAmount).toLocaleString()}円`;
        Utils.getElement('pensionEstimate').style.display = 'block';
        
        // ★★★ 修正点: 計算結果を返す ★★★
        return { npAmount, epAmount };
    }
};

// ===== 固定費管理システム =====
const FixedCostManager = {
    render() {
        const container = Utils.getElement('fixedCostsGrid');
        container.innerHTML = APP_DATA.categories.map(cat => this.createCostItem(cat)).join('');
        APP_DATA.categories.forEach(cat => {
            const input = Utils.getElement(`cost-${cat.id}`);
            input.value = appState.fixedCosts[cat.id]?.amount > 0 ? appState.fixedCosts[cat.id].amount : '';
            input.addEventListener('input', () => Utils.debounce('updateFixedCosts', () => this.updateCosts(), 300));
        });
        this.updateCosts();
    },
    createCostItem(category) {
        return `
            <div class="fixed-cost-item">
                <div class="cost-icon">${category.icon}</div>
                <div class="cost-details">
                    <label for="cost-${category.id}" class="cost-name">${category.name}</label>
                    <p class="cost-description">${category.description}</p>
                </div>
                <div class="input-wrapper">
                    <input type="number" class="cost-input form-control" id="cost-${category.id}" placeholder="${category.placeholder}" min="0" max="${category.max}" step="0.1" aria-label="${category.name}の月額">
                    <span class="input-unit">万円</span>
                </div>
            </div>`;
    },
    updateCosts() {
        let total = 0;
        APP_DATA.categories.forEach(cat => {
            const input = Utils.getElement(`cost-${cat.id}`);
            const amount = Utils.parseNumber(input.value, 0);
            appState.fixedCosts[cat.id] = { amount, isActive: amount > 0 };
            input.closest('.fixed-cost-item').classList.toggle('active', amount > 0);
            if (amount > 0) total = Utils.preciseAdd(total, amount);
        });

        Utils.getElement('totalFixedCosts').textContent = Utils.formatCurrency(total);
        const income = appState.basicInfo.income || 0;
        const ratio = income > 0 ? Utils.precisePercentage(total, income) : 0;
        Utils.getElement('fixedCostsRatio').textContent = `${ratio.toFixed(0)}%`;
        
        const adviceEl = Utils.getElement('ratioAdvice');
        if (ratio > 50) { adviceEl.textContent = '🚨 固定費比率が高すぎます！見直しを強く推奨します。'; adviceEl.className = 'ratio-advice advice-error';}
        else if (ratio > 40) { adviceEl.textContent = '🤔 固定費比率がやや高めです。見直しの余地がありそうです。'; adviceEl.className = 'ratio-advice advice-warning';}
        else { adviceEl.textContent = '✅ 理想的な固定費比率です！'; adviceEl.className = 'ratio-advice advice-good';}
    }
};

// ===== ライフイベント管理システム =====
const LifeEventManager = {
    render() {
        const container = Utils.getElement('lifeEventsGrid');
        container.innerHTML = APP_DATA.lifeEvents.map(event => this.createEventItem(event)).join('');
        container.querySelectorAll('.life-event-item').forEach(item => {
            item.addEventListener('click', () => this.toggleEvent(item.dataset.eventKey, item));
        });
        this.updateDetailSettingsVisibility();
    },
    createEventItem(event) {
        const selected = appState.lifeEvents[event.key];
        return `
            <div class="life-event-item ${selected ? 'selected' : ''}" data-event-key="${event.key}" role="button" tabindex="0">
                <div class="event-icon">${event.icon}</div>
                <div class="event-content">
                    <div class="event-text">${event.text}</div>
                    <div class="event-description">${event.description}</div>
                </div>
                <div class="toggle-switch ${selected ? 'active' : ''}"><div class="toggle-slider"></div></div>
            </div>`;
    },
    toggleEvent(key, item) {
        appState.lifeEvents[key] = !appState.lifeEvents[key];
        item.classList.toggle('selected');
        item.querySelector('.toggle-switch').classList.toggle('active');
        this.updateDetailSettingsVisibility();
        FormManager.autoSave();
    },
    updateDetailSettingsVisibility() {
        APP_DATA.lifeEvents.forEach(event => {
            if (event.hasDetail) {
                const group = Utils.getElement(event.detailSettingKey);
                group.style.display = appState.lifeEvents[event.key] ? 'block' : 'none';
            }
        });
    }
};

// ===== カスタムライフイベント管理システム =====
const CustomEventManager = {
    setup() {
        Utils.getElement('addCustomEventButton').addEventListener('click', () => this.showForm());
        Utils.getElement('cancelCustomEventButton').addEventListener('click', () => this.hideForm());
        Utils.getElement('saveCustomEventButton').addEventListener('click', () => this.saveEvent());
        Utils.getElement('customLifeEventsList').addEventListener('click', e => {
            const item = e.target.closest('.custom-event-item');
            if (!item) return;
            const id = item.dataset.id;
            if (e.target.closest('.edit-custom-event')) this.showForm(id);
            if (e.target.closest('.delete-custom-event')) this.deleteEvent(id);
        });
        this.render();
    },
    render() {
        const list = Utils.getElement('customLifeEventsList');
        const placeholder = Utils.getElement('customEventsPlaceholder');
        list.innerHTML = '';
        if (appState.customLifeEvents.length === 0) {
            placeholder.style.display = 'flex';
        } else {
            placeholder.style.display = 'none';
            appState.customLifeEvents.forEach(event => list.appendChild(this.createEventItem(event)));
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
                <button type="button" class="btn btn--secondary edit-custom-event" aria-label="編集"><svg class="btn-icon"><use xlink:href="#icon-edit"></use></svg></button>
                <button type="button" class="btn btn--secondary delete-custom-event" aria-label="削除"><svg class="btn-icon"><use xlink:href="#icon-trash"></use></svg></button>
            </div>`;
        return item;
    },
    showForm(id = null) {
        this.resetForm();
        if (id) {
            const event = appState.customLifeEvents.find(e => e.id === id);
            Utils.getElement('customEventId').value = event.id;
            Utils.getElement('customEventName').value = event.name;
            Utils.getElement('customEventAmount').value = event.amount;
            Utils.getElement('customEventAge').value = event.age;
        }
        Utils.getElement('customEventFormContainer').style.display = 'block';
        Utils.getElement('addCustomEventButton').style.display = 'none';
    },
    hideForm() {
        Utils.getElement('customEventFormContainer').style.display = 'none';
        Utils.getElement('addCustomEventButton').style.display = 'inline-flex';
    },
    resetForm() {
        ['customEventId', 'customEventName', 'customEventAmount', 'customEventAge'].forEach(id => {
            Utils.getElement(id).value = '';
            UIManager.clearError(id);
        });
    },
    saveEvent() {
        const id = Utils.getElement('customEventId').value;
        const name = Utils.getElement('customEventName').value;
        const amount = Utils.parseNumber(Utils.getElement('customEventAmount').value);
        const age = Utils.parseInt(Utils.getElement('customEventAge').value);
        
        if (!name || amount <= 0 || age <= 0) {
            NotificationManager.show('すべての項目を正しく入力してください。', 'error');
            return;
        }

        if (id) {
            const index = appState.customLifeEvents.findIndex(e => e.id === id);
            appState.customLifeEvents[index] = { id, name, amount, age };
        } else {
            appState.customLifeEvents.push({ id: Utils.generateId(), name, amount, age });
        }
        this.render();
        this.hideForm();
        FormManager.autoSave();
    },
    deleteEvent(id) {
        if (confirm('この支出を削除しますか？')) {
            appState.customLifeEvents = appState.customLifeEvents.filter(e => e.id !== id);
            this.render();
            FormManager.autoSave();
        }
    }
};

// ===== バリデーション管理システム =====
const StepValidator = {
    validateStep(stepNumber) {
        let isValid = true;
        const clearAndSetError = (id, message) => {
            UIManager.clearError(id);
            UIManager.showError(id, message);
            isValid = false;
        };

        const stepContainer = document.querySelector(`#step${stepNumber}`);
        if (stepContainer) {
            stepContainer.querySelectorAll('.input-error-message').forEach(el => el.style.display = 'none');
            stepContainer.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        }

        switch (stepNumber) {
            case 1:
                if (!appState.financialPersonality) clearAndSetError('financialPersonality', '価値観を選択してください。');
                if (!appState.basicInfo.birthday) clearAndSetError('birthDate', '生年月日を選択してください。');
                if (!appState.basicInfo.income) clearAndSetError('income', '手取り収入を入力してください。');
                if (!appState.basicInfo.occupation) clearAndSetError('occupation', '職業を選択してください。');
                break;
        }
        return isValid;
    }
};

// ===== ナビゲーション管理システム =====
const NavigationManager = {
    nextStep() {
        FormManager.saveCurrentStepData();
        if (!StepValidator.validateStep(appState.currentStep)) {
            NotificationManager.show('入力内容を確認してください', 'error');
            return;
        }
        if (appState.currentStep < 5) {
            appState.farthestValidatedStep = Math.max(appState.farthestValidatedStep, appState.currentStep + 1);
            UIManager.showStep(appState.currentStep + 1);
        }
    },
    previousStep() {
        if (appState.currentStep > 1) UIManager.showStep(appState.currentStep - 1);
    },
    goToStep(targetStep) {
        if (targetStep <= appState.farthestValidatedStep) UIManager.showStep(targetStep);
    }
};

// ===== 計算エンジン =====
const CalculationEngine = {
    async calculate() {
        FormManager.saveCurrentStepData();
        UIManager.showLoading();
        await new Promise(resolve => setTimeout(resolve, APP_CONFIG.CALCULATION_DELAY));

        try {
            const results = this.performCalculation();
            appState.results = results;
            UIManager.hideLoading();
            UIManager.showStep(5);
            ResultsManager.render();
            UIManager.updatePlaceholders(true);
            FormManager.autoSave();
        } catch (error) {
            UIManager.hideLoading();
            Utils.handleError(error, 'Calculation');
        }
    },
    performCalculation() {
        const currentAge = Utils.calculateAge(appState.basicInfo.birthday);
        const { retirementAge, expectedLifeExpectancy, investmentReturnRate } = appState.advancedSettings;
        const invRate = investmentReturnRate / 100;
        
        // ★★★ 修正点: PensionManager.calculate()から値を受け取る ★★★
        const pensionAmounts = PensionManager.calculate(); 
        const totalPensionAmount = (pensionAmounts.npAmount || 0) + (pensionAmounts.epAmount || 0);

        let cashBalance = 0, nisaBalance = 0, totalIncome = 0, totalExpenses = 0, nisaFinalContribution = 0;
        let yearlyData = [];

        for (let age = currentAge; age <= expectedLifeExpectancy; age++) {
            const isRetired = age >= retirementAge;
            const income = isRetired ? (totalPensionAmount * 12) : (appState.basicInfo.income * 12);
            
            let cashExpense = Object.values(appState.fixedCosts).reduce((sum, cost) => sum + (cost.amount * 12), 0);
            
            let eventCost = 0;
            appState.customLifeEvents.forEach(e => { if(e.age === age) eventCost += e.amount; });
            
            if (appState.lifeEvents.housing && age === appState.detailSettings.housingAge) {
                eventCost += APP_DATA.lifeEvents.find(e=>e.key==='housing').cost;
            }
            if(appState.lifeEvents.children && appState.detailSettings.childrenCount > 0) {
                 const firstChildAge = Math.max(currentAge + 2, 30);
                 for (let i = 0; i < appState.detailSettings.childrenCount; i++) {
                    const childBirthAge = firstChildAge + (i * 3);
                    const childsCurrentAge = age - childBirthAge;
                    if(childsCurrentAge >= 0 && childsCurrentAge < 22){
                        eventCost += (APP_DATA.lifeEvents.find(e=>e.key==='children').cost / appState.detailSettings.childrenCount) / 22;
                    }
                 }
            }
            cashExpense += eventCost;

            let nisaInvestment = 0;
            if (appState.lifeEvents.nisa && !isRetired) {
                nisaInvestment = appState.detailSettings.nisaAmount * 12;
                nisaFinalContribution += nisaInvestment;
            }
            
            nisaBalance = (nisaBalance + nisaInvestment) * (1 + invRate);
            const netCashFlow = income - cashExpense - nisaInvestment;
            cashBalance += netCashFlow;

            totalIncome += income;
            totalExpenses += cashExpense;

            yearlyData.push({ age, income, cashExpense, nisaInvestment, cumulativeCash: cashBalance, nisaBalance, totalAssets: cashBalance + nisaBalance });
        }
        
        const finalBalance = cashBalance + nisaBalance;
        const retirementData = yearlyData.find(d => d.age === retirementAge);

        return {
            totalIncome, totalExpenses, finalBalance,
            retirementAssets: retirementData ? retirementData.totalAssets : 0,
            nisaFinalContribution, nisaFinalBalance: nisaBalance,
            yearlyData,
            rating: this.calculateRating(finalBalance, totalIncome, expectedLifeExpectancy - currentAge)
        };
    },
    calculateRating(finalBalance, totalIncome, years) {
        if (years <= 0) return 'D';
        const avgAnnualIncome = totalIncome / years;
        if (finalBalance < -500) return 'D';
        if (finalBalance < 0) return 'C';
        if (finalBalance < (avgAnnualIncome * 2)) return 'B';
        if (finalBalance < (avgAnnualIncome * 5)) return 'A';
        return 'S';
    }
};

// ===== 結果管理システム =====
const ResultsManager = {
    render() {
        this.renderRatingAndSummary();
        this.renderSummaryCards();
        this.renderChart();
        this.renderAdvice();
    },
    renderRatingAndSummary() {
        const { rating, finalBalance } = appState.results;
        const ratingMap = {
            'S': { text: 'S', class: 'rating-s', msg: '素晴らしい！' }, 'A': { text: 'A', class: 'rating-a', msg: '良好です！' },
            'B': { text: 'B', class: 'rating-b', msg: 'まずまずです。' }, 'C': { text: 'C', class: 'rating-c', msg: '要注意。' },
            'D': { text: 'D', class: 'rating-d', msg: '危険水域。' }
        };
        const currentRating = ratingMap[rating];
        Utils.getElement('ratingDisplay').innerHTML = `<div class="rating-badge ${currentRating.class}">${currentRating.text}</div>`;
        Utils.getElement('resultsMainSummary').innerHTML = `最終的に <strong>${Utils.formatCurrency(finalBalance)}</strong> の資産が見込まれます。${currentRating.msg}`;
    },
    renderSummaryCards() {
        const container = Utils.getElement('resultsSummaryCards');
        const { totalIncome, totalExpenses, finalBalance, retirementAssets } = appState.results;
        const cards = [
            { icon: '💰', label: '生涯総収入', value: totalIncome, positive: true },
            { icon: '💸', label: '生涯総支出', value: totalExpenses, positive: false },
            { icon: '🏦', label: '最終資産', value: finalBalance, positive: finalBalance >= 0 },
            { icon: '👴', label: '退職時資産', value: retirementAssets, positive: retirementAssets >= 0 }
        ];
        container.innerHTML = cards.map(c => `
            <div class="result-card">
                <div class="result-icon">${c.icon}</div>
                <div class="result-label">${c.label}</div>
                <div class="result-value ${c.positive ? 'positive' : 'negative'}">${Utils.formatCurrency(c.value)}</div>
            </div>`).join('');
    },
    renderChart() {
        const ctx = Utils.getElement('lifetimeChart').getContext('2d');
        if (lifetimeChart) lifetimeChart.destroy();
        const { yearlyData } = appState.results;
        const labels = yearlyData.map(d => `${d.age}歳`);
        const datasets = [
            { label: '総資産', data: yearlyData.map(d => d.totalAssets), borderColor: 'rgba(37, 99, 235, 1)', backgroundColor: 'rgba(37, 99, 235, 0.2)', fill: true, tension: 0.3 },
            { label: '現金残高', data: yearlyData.map(d => d.cumulativeCash), borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: false, borderDash: [5, 5] },
        ];
        if (appState.lifeEvents.nisa) {
            datasets.push({ label: 'NISA評価額', data: yearlyData.map(d => d.nisaBalance), borderColor: 'rgba(16, 185, 129, 1)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: false });
            Utils.getElement('lifetimeChart').closest('.chart-section').querySelector('.nisa-legend').style.display = 'flex';
        }
        lifetimeChart = new Chart(ctx, {
            type: 'line', data: { labels, datasets },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },
    renderAdvice() {
        const container = Utils.getElement('adviceContent');
        container.innerHTML = '';
        this._addAdvice(container, this.getOverallAdvice());
        if (Object.values(appState.fixedCosts).reduce((s, c) => s + c.amount, 0) > (appState.basicInfo.income * 0.5))
            this._addAdvice(container, { type: 'warning', msg: '<strong>固定費:</strong> 収入に対する固定費の割合が50%を超えています。家計の見直しを強く推奨します。' });
        if (!appState.lifeEvents.nisa)
            this._addAdvice(container, { type: 'info', msg: '<strong>投資:</strong> NISAなどの積立投資が計画に含まれていません。インフレ対策として少額からでも始めることを検討しましょう。' });
        this._addAdvice(container, this.getPersonalityAdvice());
    },
    _addAdvice(container, {type, msg}) {
        const item = document.createElement('div');
        item.className = `advice-item type-${type}`;
        item.innerHTML = `<div>${msg}</div>`;
        container.appendChild(item);
    },
    getOverallAdvice() {
        const { rating } = appState.results;
        const personality = appState.financialPersonality || 'security';
        const keywords = APP_DATA.personalityTypes[personality].keywords;
        const messages = {
            S: `<strong>総合評価 (S): 素晴らしい！</strong> あなたの理想とする「${keywords[0]}」のある未来が期待できます。盤石な計画です。`,
            A: `<strong>総合評価 (A): 良好です。</strong> あなたが大切にする「${keywords[0]}」を実現する土台はしっかり築かれています。この調子でいきましょう。`,
            B: `<strong>総合評価 (B): まずまずです。</strong> あなたの目標である「${keywords[0]}」のためには、もう少し工夫が必要です。改善の余地があります。`,
            C: `<strong>総合評価 (C): 注意が必要です。</strong> このままでは、あなたの望む「${keywords[0]}」を達成するのは難しいかもしれません。計画を見直しましょう。`,
            D: `<strong>総合評価 (D): 危険な状態です。</strong> 早急な対策が必要です。将来の「${keywords[0]}」が危ぶまれます。専門家への相談も検討してください。`
        };
        const type = rating >= 'C' ? 'good' : 'warning';
        return { type, msg: messages[rating] };
    },
    getPersonalityAdvice() {
        const personality = appState.financialPersonality || 'security';
        const messages = {
            security: `<strong>あなたへ (安定重視型):</strong> 将来の安心を確実にする素晴らしい計画です。リスクの低い個人向け国債やiDeCoの活用も検討し、さらなる安定を目指しましょう。`,
            growth: `<strong>あなたへ (自己投資型):</strong> スキルアップへの投資は、将来の収入増に繋がり、結果としてあなたの可能性を広げます。計画に「自己投資費」を具体的に組み込み、リターンを最大化しましょう。`,
            freedom: `<strong>あなたへ (現在志向型):</strong> 「今」を楽しむための経済基盤を築けています。「カスタムライフイベント」でやりたいことを具体的に計画し、人生をさらに豊かにしましょう。`,
            contribution: `<strong>あなたへ (貢献・家族型):</strong> 大切な人との時間を守るための計画ができています。家族や社会への想いを形にするため、生命保険や相続対策、寄付なども視野に入れてみましょう。`
        };
        return { type: 'info', msg: messages[personality] };
    }
};

// ===== グローバル関数 (イベントハンドラ) =====
function nextStep() { NavigationManager.nextStep(); }
function prevStep() { NavigationManager.previousStep(); }
function calculateResults() { CalculationEngine.calculate(); }
function resetApp() { if (confirm('入力をリセットしますか？')) { StorageManager.clear(); location.reload(); } }
function saveSettings() { FormManager.autoSave(); NotificationManager.show('設定を保存しました', 'success'); }
function scrollToAdvice() { Utils.scrollToElement(Utils.getElement('advice-section'), 80); }
function exportResults() { /* ...実装 ... */ }
function downloadChartImage() { if (lifetimeChart) { const a = document.createElement('a'); a.href = lifetimeChart.toBase64Image(); a.download = 'my-chart.png'; a.click(); } }
function shareResults() { /* ...実装 ... */ }
function closeQuickGuide() { UIManager.closeQuickGuide(); }

// ===== アプリケーション初期化 =====
const AppInitializer = {
    init() {
        this.loadData();
        this.setupUI();
        this.setupEventListeners();
        UIManager.showQuickGuide();
    },
    loadData() {
        const saved = StorageManager.load();
        if (saved) {
            const defaultState = new AppState();
            appState = {
                ...defaultState,
                ...saved,
                basicInfo: { ...defaultState.basicInfo, ...saved.basicInfo },
                fixedCosts: { ...defaultState.fixedCosts, ...saved.fixedCosts },
                lifeEvents: { ...defaultState.lifeEvents, ...saved.lifeEvents },
                customLifeEvents: saved.customLifeEvents || [],
                detailSettings: { ...defaultState.detailSettings, ...saved.detailSettings },
                advancedSettings: { ...defaultState.advancedSettings, ...saved.advancedSettings },
            };
        }
    },
    setupUI() {
        FormManager.setupBirthdaySelects();
        PensionManager.setupInputs();
        CustomEventManager.setup();
        FormManager.restoreFormData();
        UIManager.showStep(appState.currentStep);
    },
    setupEventListeners() {
        document.querySelectorAll('.step-label').forEach(l => l.addEventListener('click', () => NavigationManager.goToStep(Utils.parseInt(l.dataset.step))));
        document.querySelectorAll('input[name="financialPersonality"]').forEach(r => r.addEventListener('change', e => {
            appState.financialPersonality = e.target.value;
            FormManager.autoSave();
            UIManager.clearError('financialPersonality');
        }));
        ['income', 'occupation', 'childrenCount', 'housingAge', 'nisaAmount', 'retirementAge', 'expectedLifeExpectancy', 'investmentReturnRate']
            .forEach(id => {
                const el = Utils.getElement(id, false);
                if (el) el.addEventListener('input', () => FormManager.saveCurrentStepData());
            });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        AppInitializer.init();
    } catch (e) {
        console.error("Fatal Error:", e);
        document.body.innerHTML = '<h1>アプリケーションの起動に失敗しました。ページを再読み込みしてください。</h1>';
    }
});