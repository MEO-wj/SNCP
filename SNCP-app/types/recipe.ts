export type Recipe = {
  id: number | string;
  name: string;
  source?: string;
  library_scope?: 'local' | 'server';
  cuisine?: string | null;
  tags?: string[];
  ingredients?: { name: string; amount?: string }[];
  steps?: string[];
  nutrition?: Record<string, number>;
  suitable_for?: string[];
  cover_url?: string | null;
  source_url?: string | null;
  source_provider?: string | null;
};
