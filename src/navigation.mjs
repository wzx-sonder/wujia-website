// Canonical labels and destinations for current navigation and content entries.
// Legacy incoming hashes are deliberately maintained separately in products.mjs.
export const entries = {
  home: { label: '首页', href: '/' },
  about: { label: '认识悟佳', href: '/about/' },
  products: { label: '产品与项目', href: '/products/' },
  ai: { label: 'AI 能力', href: '/ai/' },
  studio: { label: 'AI+X 共创', href: '/studio/' },
  vision: { label: '发展愿景', href: '/vision/' },
  films: { label: '项目短片', href: '/films/' },
  wuxuexi: { label: '悟学习详情', href: '/products/wuxuexi/' },
  campus: { label: 'Campus AI 详情', href: '/products/campus-ai/' },
  toujing: { label: '投镜详情', href: '/products/toujing/' },
  hubu: { label: 'Campus AI · HUBU 校园版', href: '/products/campus-ai/?edition=campus' },
  kcode: { label: 'KCode 商业版', href: '/products/campus-ai/?edition=kcode' }
};
export const mainNavigation = ['home', 'about', 'products', 'ai', 'studio', 'vision'];
export const playLabel = '播放宣传片';
