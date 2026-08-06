window.HER_SHIELD_CONFIG = {
    // 迁移腾讯云账号后，把这里替换成新 CloudBase 环境的访问域名。
    // 示例: https://xxx-1234567890.ap-shanghai.app.tcloudbase.com
    CLOUDBASE_BASE_URL: 'https://her-shield-d8g3dpm9ucee2058f-1410225134.ap-shanghai.app.tcloudbase.com',

    // 她行·维权导航决策树后端。生产环境按 CloudBase 函数名访问 /guide-tree；
    // 本地 dev server 未配置该项时仍使用 /api/guide-tree。
    GUIDE_TREE_API_BASE: 'https://her-shield-d8g3dpm9ucee2058f-1410225134.ap-shanghai.app.tcloudbase.com',
    GUIDE_TREE_API_PATH: '/guide-tree'
};
