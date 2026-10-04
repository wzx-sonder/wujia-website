// Product facts and positioning from the approved single-page website.
export const products = [
  {
    id: 'wuxuexi', slug: 'wuxuexi', title: '悟学习', kicker: '01 / AI + EDUCATION',
    tagline: '让教学有序，让每一份学习被看见。',
    summary: '连接教学管理、学习过程与反馈，让学生、教师、家长与管理者围绕同一份学习进展协作。',
    editions: [['school', '学校版'], ['institution', '教培机构版']], group: 'education', defaultVideo: 'school',
    lead: '把教学管理、学习过程与反馈连接起来。',
    intro: '学生、教师、家长与管理者围绕同一份学习进展协作，让日常教学中的信息流转更清晰。',
    visit: 'wuxuexi', visitLabel: '访问悟学习'
  },
  {
    id: 'campus', slug: 'campus-ai', title: 'Campus AI', kicker: '02 / AI + DEVELOPMENT',
    tagline: '从模型入口，走向项目工作台。',
    summary: '连接模型服务、桌面工具与运行支持。HUBU 校园版与 KCode 商业版，同属一个产品体系。',
    editions: [['campus', '校园版 · HUBU'], ['kcode', '商业版 · KCode']], group: 'campus', defaultVideo: 'campus',
    status: 'KCode 商业版已上线', visit: 'campus'
  },
  {
    id: 'toujing', slug: 'toujing', title: '投镜', kicker: '03 / AI + REFLECTION',
    tagline: '回到记录，看清决策的过程。',
    summary: '整理历史交易记录，通过可视化与复盘理解过去的行为与选择，持续验证使用体验。',
    defaultVideo: 'toujing', status: '测试验证中',
    lead: '用历史记录，理解过去的行为与选择。',
    intro: '由团队成员开展的项目实践，围绕股票历史交易记录进行整理、可视化与复盘，持续验证使用体验。',
    visit: 'toujing', visitLabel: '访问投镜'
  }
];

// Compatibility for incoming links shared before the multipage website.
export const legacyRoutes = {
  company: '/#approach', overview: '/#approach',
  products: '/products/', wuxuexi: '/products/wuxuexi/', campus: '/products/campus-ai/',
  kcode: '/products/campus-ai/?edition=kcode', toujing: '/products/toujing/',
  capabilities: '/studio/#capabilities', workflow: '/studio/#workflow', studio: '/studio/',
  scenarios: '/studio/#scenarios', method: '/studio/#method', collaboration: '/studio/#collaboration',
  vision: '/vision/', possibility: '/vision/#possibility', films: '/films/'
};
