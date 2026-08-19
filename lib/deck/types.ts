export type DeckOption = {
  pole: string | null;
  text: string;
  optionKey: 'a' | 'b';
};

export type DeckItem = {
  questionId: number | null;
  axis: string | null;
  top: DeckOption;
  bottom: DeckOption;
};

export type Axis = {
  key: string;
  left: string;
  right: string;
  leftLabel: string;
  rightLabel: string;
};

export type Tallies = {
  [pole: string]: number;
} & { total: number };