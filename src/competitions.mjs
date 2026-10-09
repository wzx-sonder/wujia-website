// Public competition information shared by the navigation, listing and notice pages.
export const competitions = [
  {
    slug: 'kcoding-2026', title: 'KCoding 大赛', noticeTitle: 'KCoding 大赛通知',
    href: '/competitions/kcoding-2026/', year: '2026', organizer: 'KCode 项目组',
    summary: '面向全体在校大学生，以 KCode 为主要开发工具，运用 AI 辅助编程完成原创、可运行、可演示的软件作品。',
    audience: '全体在校大学生，不限学校、专业',
    team: '个人参赛或 1—5 人组队，可跨校组队', period: '2026.10.12 — 10.25',
    dates: [
      { label: '报名截止', text: '2026 年 10 月 18 日 24 时', datetime: '2026-10-19T00:00:00+08:00' },
      { label: '作品提交截止', text: '2026 年 10 月 24 日 24 时', datetime: '2026-10-25T00:00:00+08:00' },
      { label: '评审及公布', text: '2026 年 10 月 25 日', datetime: '2026-10-25' }
    ],
    tracks: ['AI 智能体', '校园学习', '趣味创想', '开源极客'],
    noticeFile: 'competitions/kcoding-2026.html',
    attachment: { label: 'KCoding大赛报名表.docx', href: '/assets/competitions/kcoding-2026/KCoding大赛报名表.docx' }
  }
];
