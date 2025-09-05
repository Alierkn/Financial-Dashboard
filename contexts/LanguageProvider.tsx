import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

type Language = 'en' | 'tr';

const translations = {
  en: {
    // Auth
    welcomeBack: 'Welcome Back!',
    createAccount: 'Create Account',
    signInToDashboard: 'Sign in to access your dashboard.',
    getStartedByCreatingAccount: 'Get started by creating a new account.',
    emailAddress: 'Email Address',
    password: 'Password',
    processing: 'Processing...',
    signIn: 'Sign In',
    orContinueWith: 'Or continue with',
    signInWithGoogle: 'Sign in with Google',
    dontHaveAccount: "Don't have an account? ",
    alreadyHaveAccount: "Already have an account? ",
    signUp: 'Sign Up',
    errorFirebaseConfigEmail: 'Configuration error. Please enable Email/Password sign-in provider in your Firebase project.',
    errorFirebaseConfigGoogle: 'Configuration error. Please enable the Google sign-in provider in your Firebase project.',
    errorGoogleSignIn: 'Failed to sign in with Google.',
    errorOccurred: 'An error occurred.',

    // Dashboard
    financialDashboard: 'Financial Dashboard',
    welcomeMessage: 'Welcome, <span class="font-semibold text-slate-300">{{email}}</span>',
    signOut: 'Sign Out',
    startNewMonthlyBudget: 'Start New Monthly Budget',
    welcomeToHub: 'Welcome to Your Financial Hub!',
    noBudgetsYet: "You haven't set up any monthly budgets yet. <br/>Click the button above to get started.",
    viewYearSummary: 'View {{year}} Summary',
    budget: 'Budget',
    viewDetailsFor: 'View details for {{month}}',
    deleteBudgetFor: 'Delete budget for {{month}}',
    
    // Monthly Setup
    newMonthlyBudget: 'New Monthly Budget',
    setBudgetForNewMonth: 'Set your budget for a new month.',
    year: 'Year',
    month: 'Month',
    monthlyBudgetLimit: 'Monthly Budget Limit',
    baseMonthlyIncome: 'Base Monthly Income',
    monthlyIncomeGoalOptional: 'Monthly Income Goal (Optional)',
    monthlyIncomeGoal: 'Monthly Income Goal',
    currency: 'Currency',
    cancel: 'Cancel',
    creating: 'Creating...',
    createBudget: 'Create Budget',
    errorMonthExists: 'A budget for {{monthId}} already exists.',
    errorInvalidLimit: 'Please enter a valid, positive number for the budget limit.',
    errorInvalidIncome: 'Please enter a valid, non-negative number for income.',
    errorInvalidIncomeGoal: 'Please enter a valid, non-negative number for the income goal.',
    eg1000: 'e.g., 1000',
    eg3000: 'e.g., 3000',
    eg4000: 'e.g., 4000',

    // Limit Setter (Initial Setup)
    welcome: 'Welcome!',
    setMonthlyBudgetPrompt: 'Set your monthly budget to get started.',
    monthlyIncome: 'Monthly Income',
    settingUp: 'Setting Up...',
    startTracking: 'Start Tracking',

    // Monthly View
    dashboard: 'Dashboard',
    export: 'Export',
    expenses: 'Expenses',
    trend: 'Trend',
    categories: 'Categories',
    income: 'Income',
    incomeTrend: 'Income Trend',

    // Summary
    totalSpent: 'Total Spent',
    remainingBudget: 'Remaining Budget',
    limit: 'Limit',
    completedIncome: 'Completed Income',
    editGoal: 'Edit Goal',
    setGoal: 'Set Goal',
    setIncomeGoal: 'Set income goal',
    saveIncomeGoal: 'Save income goal',
    cancelEditIncomeGoal: 'Cancel editing income goal',
    goal: 'Goal',
    noGoalSet: 'No goal set.',
    pendingIncome: 'Pending Income',
    potentialTotalIncome: 'Potential total income',
    categorySpending: 'Category Spending',
    editBudgets: 'Edit Budgets',
    setBudgets: 'Set Budgets',
    setCategoryBudgetsAndColors: 'Set Category Budgets & Colors',
    setColorFor: 'Set color for {{categoryName}}',
    colorPickerFor: 'Color picker for {{categoryName}}',
    overAllocatedBy: 'Over-allocated by:',
    remainingToAllocate: 'Remaining to Allocate:',
    allocated: 'Allocated',
    saving: 'Saving...',
    saveBudgets: 'Save Budgets',
    noCategoryBudgetsSet: "No category budgets set. Click 'Set Budgets' to allocate your spending limit.",

    // Add Expense Form
    addNewExpense: 'Add New Expense',
    amount: 'Amount',
    description: 'Description',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    category: 'Category',
    addExpense: 'Add Expense',
    adding: 'Adding...',
    egCoffeeWithFriends: 'e.g., Coffee with friends',
    errorInvalidAmount: 'Please enter a valid, positive amount.',
    errorEmptyDescription: 'Description cannot be empty.',
    errorSelectCategory: 'Please select a category.',

    // Expense List
    recentExpenses: 'Recent Expenses',
    searchExpenses: 'Search Expenses',
    searchByDescription: 'Search by description...',
    noExpensesAdded: 'No expenses added yet.',
    noExpensesMatchSearch: 'No expenses match your search.',
    paidBy: 'Paid by {{method}}',
    deleteExpenseFor: 'Delete expense for {{description}}',

    // Category View
    spendingByCategory: 'Spending by Category',
    percentageOfTotal: '{{percentage}}% of total',
    categoryTotals: 'Category Totals (Click to toggle)',
    grandTotal: 'Grand Total',
    noDataToDisplay: 'No data to display.',

    // Income View
    displayingIn: 'Displaying in <strong>{{code}}</strong>. Rate: 1 {{baseCode}} = {{rate}} {{code}}',
    addNewIncomeSource: 'Add New Income Source',
    sourceName: 'Source Name',
    egLessonWithAlex: 'e.g., Lesson with Alex',
    incomeSourceName: 'Income Source Name',
    incomeSourceAmount: 'Income Source Amount',
    addSource: 'Add Source',
    yourIncomeSources: 'Your Income Sources',
    quickAddPrompt: 'Quickly add a pending transaction or manage your sources.',
    transactionDate: 'Transaction Date',
    noIncomeSources: 'No income sources defined yet.',
    editSourceName: 'Edit Source Name',
    editSourceCategory: 'Edit Source Category',
    editSourceAmount: 'Edit Source Amount',
    save: 'Save',
    fromAmount: 'from {{symbol}}{{amount}}',
    addIncomeFrom: 'Add income from {{name}}',
    editSource: 'Edit source {{name}}',
    deleteSource: 'Delete source {{name}}',
    recentIncomeTransactions: 'Recent Income Transactions',
    noIncomeRecorded: 'No income recorded yet.',
    pending: 'Pending',
    markAsPaid: 'Mark transaction from {{name}} as paid',
    deleteTransactionFor: 'Delete transaction for {{name}}',
    completed: 'Completed',
    errorEnterSourceName: 'Please enter a source name.',
    errorInvalidDate: 'Please select a valid date for the transaction.',
    confirmDeleteSource: 'Are you sure you want to delete the income source "{{name}}"? This action cannot be undone.',

    // Trend Views
    cumulativeSpendingTrend: 'Cumulative Spending Trend',
    cumulativeIncomeTrend: 'Cumulative Income Trend',
    day: 'Day',
    cumulative: 'Cumulative',
    noExpenseDataForTrend: 'No expense data to display trend.',
    noCompletedIncomeForTrend: 'No completed income data to display trend.',

    // Comparison View
    thisMonthVsLastMonth: 'This Month vs. Last Month',
    cumulativeSpendingComparison: 'Cumulative Spending Comparison',
    dayOfMonth: 'Day of Month',

    // Annual View
    annualSummary: '{{year}} Annual Summary',
    viewYear: 'View Year',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    selectYearToView: 'Select year to view annual summary',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netBalance: 'Net Balance',
    net: 'Net',
    monthlyFinancialOverview: 'Monthly Financial Overview',
    underBudgetBy: 'Under Budget by',
    overBudgetBy: 'Over Budget by',
    yearlyExpenseBreakdown: 'Yearly Expense Breakdown',
    noExpenseDataForYear: 'No expense data for this year.',
    yearInReview: 'Year In Review',
    
    // Currency Converter
    viewIn: 'View in',
    loading: 'Loading',
    error: 'Error',
    
    // Firebase Not Configured
    firebaseNotConfigured: 'Firebase Not Configured',
    firebaseNotConfiguredMessage: 'This application requires a connection to a Firebase project to function correctly. Please update the <code class="bg-slate-700/50 text-sky-300 p-1 rounded-md">firebase.ts</code> file with your own Firebase project configuration.',
    firebaseOpenFile: 'Open <code class="text-sky-300">firebase.ts</code> and replace the placeholder configuration:',
    firebaseGetValues: 'You can get these values from your Firebase project console under Project settings.',

    // Main App & Toasts
    errorAdBlocker: 'Could not load your {{type}}. This may be due to a browser extension (like an ad-blocker) or a network issue. Please try disabling extensions and check your internet connection.',
    errorCouldNotLoad: 'Could not load your {{type}}. Please check your connection and try again. Error: {{message}}',
    errorCreateBudget: 'Failed to create new budget. Please check your connection and try again.',
    confirmDeleteMonth: 'Are you sure you want to delete this entire month? This action cannot be undone.',
    errorActiveMonth: 'No active month selected. Could not perform action.',
    successExpenseAdded: 'Expense successfully added!',
    errorAddExpense: 'Failed to add expense.',
    successExpenseDeleted: 'Expense deleted.',
    errorDeleteExpense: 'Failed to delete expense.',
    successBudgetsSaved: 'Category budgets saved!',
    errorSaveBudgets: 'Failed to save category budgets.',
    successGoalSet: 'Income goal updated!',
    errorSetGoal: 'Failed to update income goal.',
    successSourceAdded: 'Income source added!',
    errorAddSource: 'Failed to add income source.',
    successSourceUpdated: 'Income source updated!',
    errorUpdateSource: 'Failed to update income source.',
    successSourceDeleted: 'Income source deleted.',
    errorDeleteSource: 'Failed to delete income source.',
    successTransactionAdded: 'Income transaction added.',
    errorAddTransaction: 'Failed to add income transaction.',
    successTransactionDeleted: 'Transaction deleted.',
    errorDeleteTransaction: 'Failed to delete transaction.',
    successTransactionUpdated: 'Transaction status updated.',
    errorUpdateTransaction: 'Failed to update transaction status.',
    successColorsSaved: 'Category colors saved.',
    errorSaveColors: 'Failed to save category colors.',
    successMonthDeleted: 'Monthly budget has been deleted.',
    errorDeleteMonth: 'Failed to delete month.',
    
    // Categories
    category_food: 'Food',
    category_transport: 'Transport',
    category_shopping: 'Shopping',
    category_bills: 'Bills',
    category_entertainment: 'Entertainment',
    category_health: 'Health',
    category_other: 'Other',

    // Income Categories
    incomeCategory_private_lesson: 'Private Lesson',
    incomeCategory_italy_consultancy: 'Italy Consultancy',
    incomeCategory_refunds: 'Refunds',
    incomeCategory_other: 'Other',
  },
  tr: {
    // Auth
    welcomeBack: 'Tekrar Hoş Geldiniz!',
    createAccount: 'Hesap Oluştur',
    signInToDashboard: 'Panonuza erişmek için giriş yapın.',
    getStartedByCreatingAccount: 'Yeni bir hesap oluşturarak başlayın.',
    emailAddress: 'E-posta Adresi',
    password: 'Şifre',
    processing: 'İşleniyor...',
    signIn: 'Giriş Yap',
    orContinueWith: 'Veya şununla devam et',
    signInWithGoogle: 'Google ile Giriş Yap',
    dontHaveAccount: 'Hesabınız yok mu? ',
    alreadyHaveAccount: 'Zaten bir hesabınız var mı? ',
    signUp: 'Kaydol',
    errorFirebaseConfigEmail: 'Yapılandırma hatası. Lütfen Firebase projenizde E-posta/Şifre ile giriş sağlayıcısını etkinleştirin.',
    errorFirebaseConfigGoogle: 'Yapılandırma hatası. Lütfen Firebase projenizde Google ile giriş sağlayıcısını etkinleştirin.',
    errorGoogleSignIn: 'Google ile giriş yapılamadı.',
    errorOccurred: 'Bir hata oluştu.',

    // Dashboard
    financialDashboard: 'Finansal Pano',
    welcomeMessage: 'Hoş geldiniz, <span class="font-semibold text-slate-300">{{email}}</span>',
    signOut: 'Çıkış Yap',
    startNewMonthlyBudget: '+ Yeni Aylık Bütçe Başlat',
    welcomeToHub: 'Finans Merkezinize Hoş Geldiniz!',
    noBudgetsYet: "Henüz aylık bir bütçe oluşturmadınız. <br/>Başlamak için yukarıdaki düğmeye tıklayın.",
    viewYearSummary: '{{year}} Özetini Görüntüle',
    budget: 'Bütçe',
    viewDetailsFor: '{{month}} detaylarını görüntüle',
    deleteBudgetFor: '{{month}} bütçesini sil',

    // Monthly Setup
    newMonthlyBudget: 'Yeni Aylık Bütçe',
    setBudgetForNewMonth: 'Yeni bir ay için bütçenizi belirleyin.',
    year: 'Yıl',
    month: 'Ay',
    monthlyBudgetLimit: 'Aylık Bütçe Limiti',
    baseMonthlyIncome: 'Aylık Taban Gelir',
    monthlyIncomeGoalOptional: 'Aylık Gelir Hedefi (İsteğe Bağlı)',
    monthlyIncomeGoal: 'Aylık Gelir Hedefi',
    currency: 'Para Birimi',
    cancel: 'İptal',
    creating: 'Oluşturuluyor...',
    createBudget: 'Bütçe Oluştur',
    errorMonthExists: '{{monthId}} için zaten bir bütçe mevcut.',
    errorInvalidLimit: 'Lütfen bütçe limiti için geçerli, pozitif bir sayı girin.',
    errorInvalidIncome: 'Lütfen gelir için geçerli, negatif olmayan bir sayı girin.',
    errorInvalidIncomeGoal: 'Lütfen gelir hedefi için geçerli, negatif olmayan bir sayı girin.',
    eg1000: 'ör. 1000',
    eg3000: 'ör. 3000',
    eg4000: 'ör. 4000',
    
    // Limit Setter (Initial Setup)
    welcome: 'Hoş geldiniz!',
    setMonthlyBudgetPrompt: 'Başlamak için aylık bütçenizi belirleyin.',
    monthlyIncome: 'Aylık Gelir',
    settingUp: 'Kuruluyor...',
    startTracking: 'Takibe Başla',

    // Monthly View
    dashboard: 'Pano',
    export: 'Dışa Aktar',
    expenses: 'Harcamalar',
    trend: 'Trend',
    categories: 'Kategoriler',
    income: 'Gelir',
    incomeTrend: 'Gelir Trendi',

    // Summary
    totalSpent: 'Toplam Harcama',
    remainingBudget: 'Kalan Bütçe',
    limit: 'Limit',
    completedIncome: 'Tamamlanan Gelir',
    editGoal: 'Hedefi Düzenle',
    setGoal: 'Hedef Belirle',
    setIncomeGoal: 'Gelir hedefi belirle',
    saveIncomeGoal: 'Gelir hedefini kaydet',
    cancelEditIncomeGoal: 'Gelir hedefi düzenlemesini iptal et',
    goal: 'Hedef',
    noGoalSet: 'Hedef belirlenmemiş.',
    pendingIncome: 'Bekleyen Gelir',
    potentialTotalIncome: 'Potansiyel toplam gelir',
    categorySpending: 'Kategori Harcamaları',
    editBudgets: 'Bütçeleri Düzenle',
    setBudgets: 'Bütçe Belirle',
    setCategoryBudgetsAndColors: 'Kategori Bütçeleri ve Renkleri Ayarla',
    setColorFor: '{{categoryName}} için renk ayarla',
    colorPickerFor: '{{categoryName}} için renk seçici',
    overAllocatedBy: 'Fazla Tahsis:',
    remainingToAllocate: 'Tahsis Edilecek Kalan:',
    allocated: 'Tahsis Edildi',
    saving: 'Kaydediliyor...',
    saveBudgets: 'Bütçeleri Kaydet',
    noCategoryBudgetsSet: "Kategori bütçesi belirlenmemiş. Harcama limitinizi tahsis etmek için 'Bütçe Belirle'ye tıklayın.",
    
    // Add Expense Form
    addNewExpense: 'Yeni Harcama Ekle',
    amount: 'Tutar',
    description: 'Açıklama',
    paymentMethod: 'Ödeme Yöntemi',
    cash: 'Nakit',
    card: 'Kart',
    category: 'Kategori',
    addExpense: 'Harcama Ekle',
    adding: 'Ekleniyor...',
    egCoffeeWithFriends: 'ör. Arkadaşlarla kahve',
    errorInvalidAmount: 'Lütfen geçerli, pozitif bir tutar girin.',
    errorEmptyDescription: 'Açıklama boş olamaz.',
    errorSelectCategory: 'Lütfen bir kategori seçin.',

    // Expense List
    recentExpenses: 'Son Harcamalar',
    searchExpenses: 'Harcama Ara',
    searchByDescription: 'Açıklamaya göre ara...',
    noExpensesAdded: 'Henüz harcama eklenmemiş.',
    noExpensesMatchSearch: 'Aramanızla eşleşen harcama bulunamadı.',
    paidBy: 'Ödeme: {{method}}',
    deleteExpenseFor: '{{description}} harcamasını sil',

    // Category View
    spendingByCategory: 'Kategoriye Göre Harcama',
    percentageOfTotal: 'Toplamın %{{percentage}}',
    categoryTotals: 'Kategori Toplamları (Değiştirmek için tıkla)',
    grandTotal: 'Genel Toplam',
    noDataToDisplay: 'Görüntülenecek veri yok.',
    
    // Income View
    displayingIn: '<strong>{{code}}</strong> olarak görüntüleniyor. Kur: 1 {{baseCode}} = {{rate}} {{code}}',
    addNewIncomeSource: 'Yeni Gelir Kaynağı Ekle',
    sourceName: 'Kaynak Adı',
    egLessonWithAlex: 'ör. Alex ile ders',
    incomeSourceName: 'Gelir Kaynağı Adı',
    incomeSourceAmount: 'Gelir Kaynağı Tutarı',
    addSource: 'Kaynak Ekle',
    yourIncomeSources: 'Gelir Kaynaklarınız',
    quickAddPrompt: 'Hızlıca bekleyen bir işlem ekleyin veya kaynaklarınızı yönetin.',
    transactionDate: 'İşlem Tarihi',
    noIncomeSources: 'Henüz gelir kaynağı tanımlanmamış.',
    editSourceName: 'Kaynak Adını Düzenle',
    editSourceCategory: 'Kaynak Kategorisini Düzenle',
    editSourceAmount: 'Kaynak Tutarını Düzenle',
    save: 'Kaydet',
    fromAmount: 'kaynak {{symbol}}{{amount}}',
    addIncomeFrom: '{{name}} kaynağından gelir ekle',
    editSource: '{{name}} kaynağını düzenle',
    deleteSource: '{{name}} kaynağını sil',
    recentIncomeTransactions: 'Son Gelir İşlemleri',
    noIncomeRecorded: 'Henüz gelir kaydedilmemiş.',
    pending: 'Beklemede',
    markAsPaid: '{{name}} adlı işlemi ödendi olarak işaretle',
    deleteTransactionFor: '{{name}} için işlemi sil',
    completed: 'Tamamlandı',
    errorEnterSourceName: 'Lütfen bir kaynak adı girin.',
    errorInvalidDate: 'Lütfen işlem için geçerli bir tarih seçin.',
    confirmDeleteSource: '"{{name}}" adlı gelir kaynağını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',

    // Trend Views
    cumulativeSpendingTrend: 'Kümülatif Harcama Trendi',
    cumulativeIncomeTrend: 'Kümülatif Gelir Trendi',
    day: 'Gün',
    cumulative: 'Kümülatif',
    noExpenseDataForTrend: 'Trendi görüntülemek için harcama verisi yok.',
    noCompletedIncomeForTrend: 'Trendi görüntülemek için tamamlanmış gelir verisi yok.',

    // Comparison View
    thisMonthVsLastMonth: 'Bu Ay vs. Geçen Ay',
    cumulativeSpendingComparison: 'Kümülatif Harcama Karşılaştırması',
    dayOfMonth: 'Ayın Günü',
    
    // Annual View
    annualSummary: '{{year}} Yıllık Özet',
    viewYear: 'Yılı Görüntüle',
    previousYear: 'Önceki yıl',
    nextYear: 'Sonraki yıl',
    selectYearToView: 'Yıllık özeti görüntülemek için yıl seçin',
    totalIncome: 'Toplam Gelir',
    totalExpenses: 'Toplam Harcamalar',
    netBalance: 'Net Bakiye',
    net: 'Net',
    monthlyFinancialOverview: 'Aylık Finansal Genel Bakış',
    underBudgetBy: 'Bütçe Altında',
    overBudgetBy: 'Bütçe Üstünde',
    yearlyExpenseBreakdown: 'Yıllık Harcama Dağılımı',
    noExpenseDataForYear: 'Bu yıl için harcama verisi yok.',
    yearInReview: 'Yıl Değerlendirmesi',

    // Currency Converter
    viewIn: 'Görünüm',
    loading: 'Yükleniyor',
    error: 'Hata',
    
    // Firebase Not Configured
    firebaseNotConfigured: 'Firebase Yapılandırılmamış',
    firebaseNotConfiguredMessage: 'Bu uygulamanın düzgün çalışması için bir Firebase projesine bağlanması gerekir. Lütfen <code class="bg-slate-700/50 text-sky-300 p-1 rounded-md">firebase.ts</code> dosyasını kendi Firebase proje yapılandırmanızla güncelleyin.',
    firebaseOpenFile: '<code class="text-sky-300">firebase.ts</code> dosyasını açın ve yer tutucu yapılandırmayı değiştirin:',
    firebaseGetValues: 'Bu değerleri Firebase proje konsolunuzdaki Proje ayarlarından alabilirsiniz.',

    // Main App & Toasts
    errorAdBlocker: '{{type}} yüklenemedi. Bu, bir tarayıcı eklentisinden (reklam engelleyici gibi) veya bir ağ sorunundan kaynaklanıyor olabilir. Lütfen eklentileri devre dışı bırakmayı deneyin ve internet bağlantınızı kontrol edin.',
    errorCouldNotLoad: '{{type}} yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin. Hata: {{message}}',
    errorCreateBudget: 'Yeni bütçe oluşturulamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    confirmDeleteMonth: 'Bu ayın tamamını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    errorActiveMonth: 'Aktif ay seçili değil. İşlem gerçekleştirilemedi.',
    successExpenseAdded: 'Harcama başarıyla eklendi!',
    errorAddExpense: 'Harcama eklenemedi.',
    successExpenseDeleted: 'Harcama silindi.',
    errorDeleteExpense: 'Harcama silinemedi.',
    successBudgetsSaved: 'Kategori bütçeleri kaydedildi!',
    errorSaveBudgets: 'Kategori bütçeleri kaydedilemedi.',
    successGoalSet: 'Gelir hedefi güncellendi!',
    errorSetGoal: 'Gelir hedefi güncellenemedi.',
    successSourceAdded: 'Gelir kaynağı eklendi!',
    errorAddSource: 'Gelir kaynağı eklenemedi.',
    successSourceUpdated: 'Gelir kaynağı güncellendi!',
    errorUpdateSource: 'Gelir kaynağı güncellenemedi.',
    successSourceDeleted: 'Gelir kaynağı silindi.',
    errorDeleteSource: 'Gelir kaynağı silinemedi.',
    successTransactionAdded: 'Gelir işlemi eklendi.',
    errorAddTransaction: 'Gelir işlemi eklenemedi.',
    successTransactionDeleted: 'İşlem silindi.',
    errorDeleteTransaction: 'İşlem silinemedi.',
    successTransactionUpdated: 'İşlem durumu güncellendi.',
    errorUpdateTransaction: 'İşlem durumu güncellenemedi.',
    successColorsSaved: 'Kategori renkleri kaydedildi.',
    errorSaveColors: 'Kategori renkleri kaydedilemedi.',
    successMonthDeleted: 'Aylık bütçe silindi.',
    errorDeleteMonth: 'Aylık bütçe silinemedi.',

    // Categories
    category_food: 'Gıda',
    category_transport: 'Ulaşım',
    category_shopping: 'Alışveriş',
    category_bills: 'Faturalar',
    category_entertainment: 'Eğlence',
    category_health: 'Sağlık',
    category_other: 'Diğer',

    // Income Categories
    incomeCategory_private_lesson: 'Özel Ders',
    incomeCategory_italy_consultancy: 'İtalya Danışmanlık',
    incomeCategory_refunds: 'İadeler',
    incomeCategory_other: 'Diğer',
  },
};

const monthsByLang: Record<Language, string[]> = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
};

const monthsShortByLang: Record<Language, string[]> = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations.en, options?: { [key: string]: string | number }) => string;
  months: string[];
  monthsShort: string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'tr');

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'tr' : 'en'));
  };

  const t = (key: keyof typeof translations.en, options?: { [key: string]: string | number }) => {
    let text = translations[language][key] || translations.en[key];
    if (options) {
      Object.entries(options).forEach(([optionKey, value]) => {
        text = text.replace(`{{${optionKey}}}`, String(value));
      });
    }
    return text;
  };

  const value = {
    language,
    toggleLanguage,
    t,
    months: monthsByLang[language],
    monthsShort: monthsShortByLang[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
