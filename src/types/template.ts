import type { FlowDraft } from '@/types/flow';

export interface FlowTemplate {
  id: string;                                   // 'tpl_news_slack' 등
  title: string;                                // 1~30자
  description: string;                          // 1~80자
  category: 'report' | 'alert' | 'data';        // 리포트 / 알림 / 데이터 정리
  draft: FlowDraft;                             // 사용자가 채워야 할 필드는 '' 로 비워둠
  requiredFields: string[];                     // 예: ['actions.0.webhookUrl']
}
