import type { Axis, DeckItem } from './types';

// BigFive 트레잇 key -> 카드 덱 축(axis) 매핑
export const BIGFIVE_AXIS_MAP: Record<string, string> = {
  bigfive_openness: 'stability',
  bigfive_conscientiousness: 'plan',
  bigfive_extraversion: 'social',
  bigfive_agreeableness: 'mind',
  bigfive_stability: 'mood',
};

// DB 조회 실패 시 사용하는 로컬 폴백 문항 (원본 그대로 유지)
export const FALLBACK_PAIRS: DeckItem[] = [
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '평생 한 동네에서 살기', optionKey: 'a' }, bottom: { pole: 'adventure', text: '매년 새로운 도시로 이사하기', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '안정적인 월급 받기', optionKey: 'a' }, bottom: { pole: 'adventure', text: '대박 아니면 쪽박, 창업하기', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '늘 가던 맛집 가기', optionKey: 'a' }, bottom: { pole: 'adventure', text: '처음 보는 음식 도전하기', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '짜여진 여행 일정', optionKey: 'a' }, bottom: { pole: 'adventure', text: '즉흥적으로 떠나는 여행', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '매일 같은 루틴', optionKey: 'a' }, bottom: { pole: 'adventure', text: '매일 다른 하루', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '안전한 선택', optionKey: 'a' }, bottom: { pole: 'adventure', text: '짜릿한 도전', optionKey: 'b' } },
  { axis: 'stability', questionId: null, top: { pole: 'stable', text: '예측 가능한 하루', optionKey: 'a' }, bottom: { pole: 'adventure', text: '무슨 일이 생길지 모르는 하루', optionKey: 'b' } },

  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '데이터로 설득하기', optionKey: 'a' }, bottom: { pole: 'emotion', text: '마음으로 공감하기', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '논리적인 대화', optionKey: 'a' }, bottom: { pole: 'emotion', text: '감성적인 대화', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '머리로 결정하기', optionKey: 'a' }, bottom: { pole: 'emotion', text: '마음이 이끄는 대로', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '분석하며 보는 영화', optionKey: 'a' }, bottom: { pole: 'emotion', text: '펑펑 울게 되는 영화', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '효율을 중시함', optionKey: 'a' }, bottom: { pole: 'emotion', text: '분위기를 중시함', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '조목조목 설명하기', optionKey: 'a' }, bottom: { pole: 'emotion', text: '그냥 느끼는 대로 표현하기', optionKey: 'b' } },
  { axis: 'mind', questionId: null, top: { pole: 'logic', text: '팩트 위주로 말하기', optionKey: 'a' }, bottom: { pole: 'emotion', text: '뉘앙스 위주로 말하기', optionKey: 'b' } },

  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '여행은 계획표부터 짜기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '일단 떠나고 보기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '할 일 목록 작성하기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '생각나는 대로 행동하기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '약속은 미리 정하기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '즉흥 만남 좋아하기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '예산 짜서 소비하기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '끌리는 대로 소비하기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '식단 미리 짜두기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '그날 끌리는 거 먹기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '정해진 루틴 지키기', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '그때그때 다르게 하기', optionKey: 'b' } },
  { axis: 'plan', questionId: null, top: { pole: 'planner', text: '미리 준비해두는 성격', optionKey: 'a' }, bottom: { pole: 'spontaneous', text: '닥치면 하는 성격', optionKey: 'b' } },

  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '친구들과 왁자지껄', optionKey: 'a' }, bottom: { pole: 'independence', text: '혼자만의 시간', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '다같이 정하기', optionKey: 'a' }, bottom: { pole: 'independence', text: '혼자 정하기', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '무리 안에서 함께', optionKey: 'a' }, bottom: { pole: 'independence', text: '내 갈 길 가기', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '고민을 나누기', optionKey: 'a' }, bottom: { pole: 'independence', text: '혼자 해결하기', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '함께하는 취미', optionKey: 'a' }, bottom: { pole: 'independence', text: '혼자 하는 취미', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '다수 의견 따르기', optionKey: 'a' }, bottom: { pole: 'independence', text: '내 소신대로 하기', optionKey: 'b' } },
  { axis: 'social', questionId: null, top: { pole: 'relationship', text: '연락 자주 하는 편', optionKey: 'a' }, bottom: { pole: 'independence', text: '연락 뜸해도 괜찮은 편', optionKey: 'b' } },
];

export const AXES: Axis[] = [
  { key: 'stability', left: 'stable', right: 'adventure', leftLabel: '안정형', rightLabel: '모험형' },
  { key: 'mind', left: 'logic', right: 'emotion', leftLabel: '이성형', rightLabel: '감성형' },
  { key: 'plan', left: 'planner', right: 'spontaneous', leftLabel: '계획형', rightLabel: '즉흥형' },
  { key: 'social', left: 'relationship', right: 'independence', leftLabel: '관계형', rightLabel: '독립형' },
  { key: 'mood', left: 'steady', right: 'reactive', leftLabel: '차분형', rightLabel: '예민형' },
];