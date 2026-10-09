// Canonical labels and destinations for current navigation and content entries.
// Legacy incoming hashes are deliberately maintained separately in products.mjs.
export const entries = {
  home: { label: '首页', href: '/' },
  about: { label: '认识悟佳', href: '/#approach' },
  products: { label: '产品与项目', href: '/products/' },
  ai: { label: 'AI 能力', href: '/studio/#capabilities' },
  studio: { label: 'AI+X 共创', href: '/studio/' },
  competitions: { label: '竞赛活动', href: '/competitions/' },
  vision: { label: '发展愿景', href: '/vision/' },
  films: { label: '项目短片', href: '/films/' },
  wuxuexi: { label: '悟学习详情', href: '/products/wuxuexi/' },
  campus: { label: 'Campus AI 详情', href: '/products/campus-ai/' },
  toujing: { label: '投镜详情', href: '/products/toujing/' },
  hubu: { label: 'Campus AI · HUBU 校园版', href: '/products/campus-ai/?edition=campus' },
  kcode: { label: 'KCode 商业版', href: '/products/campus-ai/?edition=kcode' }
};
export const mainNavigation = ['home', 'products', 'studio', 'competitions', 'vision'];
// Page ownership also defines breadcrumbs and selected ancestor navigation.
export const pageHierarchy = {
  products: ['products'], studio: ['studio'],
  competitions: ['competitions'], vision: ['vision'], films: ['films']
};
export const compatibilityPages = [
  { route: '/about/', title: '认识悟佳已并入首页', destination: '/#approach', fragments: { approach: '/#approach', company: '/#approach', assets: '/#assets', contact: '/#contact' } },
  { route: '/ai/', title: 'AI 能力已融入共创页面', destination: '/studio/#capabilities', fragments: { capabilities: '/studio/#capabilities', workflow: '/studio/#workflow' } },
  { route: '/studio/ai/', title: '在共创页面继续了解 AI 能力', destination: '/studio/#capabilities', fragments: { capabilities: '/studio/#capabilities', workflow: '/studio/#workflow' } }
];
export const playLabel = '播放宣传片';
