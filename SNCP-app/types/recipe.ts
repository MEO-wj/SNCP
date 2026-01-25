export type Recipe = {
  id: number;
  name: string;
  cuisine?: string | null;
  tags?: string[];
  ingredients?: Array<{ name: string; amount?: string }>;
  steps?: string[];
  nutrition?: Record<string, number>;
  suitable_for?: string[];
};
