export type TraitData = {
  family: string;
  type: string;
  name: string;
  pole_left_label: string;
  pole_right_label: string;
  score: number;
  confidence: number;
  answered: boolean;
  history: { date: string; score: number }[];
};

export type TraitMap = Record<string, TraitData>;

export type Deltas = {
  previous: { delta: number; refDate: string } | null;
  week: { delta: number; refDate: string } | null;
  month: { delta: number; refDate: string } | null;
  year: { delta: number; refDate: string } | null;
};

export type MbtiAxis = {
  axis: string;
  score: number;
  confidence: number;
  left: string;
  right: string;
};

export type MbtiResult = {
  type: string;
  overallConfidence: number;
  axes: MbtiAxis[];
};

export type UnlockState = {
  surface: boolean;
  middle: boolean;
  deep: boolean;
  taste: boolean;
  mbti: boolean;
};

export type BlobTraits = {
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    stability: number;
  };
  middle: {
    riasecTop1: number;
    riasecTop2: number;
    decisionStyle: number;
    riskTaking: number;
    conflictStyle: number;
  };
  deep: {
    locusOfControl: number;
    loveLanguageTop: number;
    timePerspective: number;
    spendingStyle: number;
    learningMotivation: number;
  };
};