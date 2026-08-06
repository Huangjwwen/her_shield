// ==================== 初始化 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化免责声明按钮
    initDisclaimer();
    
    // 初始化侧边栏导航（新布局）
    if (document.querySelector('.sidebar-btn')) {
        initSidebarNav();
    }
    
    // 初始化标签页切换（仅在功能页面需要）
    if (document.querySelector('.tab-btn')) {
        initTabs();
    }
    
    // 初始化各功能模块（仅在功能页面需要）
    if (document.getElementById('radarInput')) {
        initRadar();
        initImageUpload('radar');
    }
    
    if (document.getElementById('selfcheckInput')) {
        initSelfcheck();
    }

    if (document.getElementById('evidenceInput')) {
        initEvidence();
    }

    if (document.getElementById('guideInput')) {
        initGuide();
    }

    if (document.getElementById('guideTreeMount')) {
        initGuideTree();
    }

    if (document.getElementById('storyTitle')) {
        initStories();
    }

    if (document.getElementById('harborInput')) {
        initHarbor();
    }
    
    // 初始化首屏按钮（仅在首页需要）
    initHero();
});
