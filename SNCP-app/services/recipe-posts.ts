import { getApiBaseUrl } from '@/services/api';
import type { AiRecommendationItem } from '@/types/ai';
import type { Recipe } from '@/types/recipe';

type RecipeIngredient = {
  name: string;
  amount?: string;
};

export type RecipePost = {
  id: string;
  source: 'demo' | 'library' | 'ai' | 'external';
  libraryScope?: 'local' | 'server';
  name: string;
  cuisine: string;
  tags: string[];
  suitableFor: string[];
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  coverUrl?: string;
  sourceUrl?: string;
  sourceProvider?: string;
  coverIndex: number;
};

const DEMO_RECIPE_BASE: Omit<
  RecipePost,
  'id' | 'source' | 'coverIndex' | 'sourceUrl' | 'sourceProvider'
>[] = [
  {
    name: '山药小米南瓜粥',
    cuisine: '家常',
    tags: ['早餐', '养胃', '低负担'],
    suitableFor: ['中老年人群', '肠胃敏感', '清淡饮食'],
    summary: '口感绵软，适合早餐或晚餐做温和补能。',
    ingredients: [
      { name: '南瓜', amount: '120g' },
      { name: '山药', amount: '100g' },
      { name: '小米', amount: '50g' },
      { name: '清水', amount: '700ml' },
    ],
    steps: [
      '南瓜和山药去皮切块，小米淘洗干净备用。',
      '锅中加水煮开后放入小米，转中小火煮 10 分钟。',
      '加入南瓜和山药继续煮 15 到 20 分钟，煮到软糯即可。',
      '关火焖 5 分钟后搅匀，适合作为早餐或晚餐。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/12349438/pexels-photo-12349438.jpeg?cs=srgb&dl=pexels-towfiqu-barbhuiya-3440682-12349438.jpg&fm=jpg',
  },
  {
    name: '番茄炒蛋',
    cuisine: '家常',
    tags: ['家常菜', '快手', '高蛋白'],
    suitableFor: ['普通家庭', '食欲欠佳', '均衡饮食'],
    summary: '经典家常菜，做法简单，适合日常高频复用。',
    ingredients: [
      { name: '番茄', amount: '2 个' },
      { name: '鸡蛋', amount: '2 个' },
      { name: '葱花', amount: '适量' },
      { name: '食用油', amount: '1 小勺' },
    ],
    steps: [
      '番茄切块，鸡蛋打散备用。',
      '热锅少油先炒鸡蛋，凝固后盛出。',
      '用余油翻炒番茄至出汁，再倒回鸡蛋翻匀。',
      '少量调味后撒葱花出锅，适合搭配米饭。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/34227769/pexels-photo-34227769.jpeg?cs=srgb&dl=pexels-novkov-visuals-34227769.jpg&fm=jpg',
  },
  {
    name: '清蒸鲈鱼',
    cuisine: '粤式',
    tags: ['低盐', '高蛋白', '晚餐'],
    suitableFor: ['高血压人群', '控盐饮食', '术后恢复'],
    summary: '蒸制保留鲜味，调味克制，适合清淡饮食场景。',
    ingredients: [
      { name: '鲈鱼', amount: '1 条约 400g' },
      { name: '姜丝', amount: '适量' },
      { name: '葱丝', amount: '适量' },
      { name: '低钠酱油', amount: '1 小勺' },
    ],
    steps: [
      '鲈鱼处理干净后在鱼身划刀，铺上姜丝。',
      '水开后上锅蒸 8 到 10 分钟，关火再焖 2 分钟。',
      '倒掉多余汤汁，铺上葱丝。',
      '淋少量低钠酱油即可，尽量保留鱼本身鲜味。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/33896073/pexels-photo-33896073.jpeg?cs=srgb&dl=pexels-sue-hsu-721218065-33896073.jpg&fm=jpg',
  },
  {
    name: '西兰花虾仁',
    cuisine: '家常',
    tags: ['高蛋白', '低脂', '午餐'],
    suitableFor: ['减脂期', '控糖饮食', '上班族'],
    summary: '颜色清爽，食材常见，适合做高频推荐卡片。',
    ingredients: [
      { name: '西兰花', amount: '180g' },
      { name: '虾仁', amount: '120g' },
      { name: '蒜末', amount: '适量' },
      { name: '食用油', amount: '1 小勺' },
    ],
    steps: [
      '西兰花切小朵焯水，虾仁去虾线备用。',
      '热锅少油，下蒜末和虾仁快速翻炒至变色。',
      '加入西兰花翻炒均匀，少量调味即可。',
      '全程少油快炒，适合作为高蛋白配菜。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/29535640/pexels-photo-29535640.jpeg?cs=srgb&dl=pexels-nano-erdozain-120534369-29535640.jpg&fm=jpg',
  },
  {
    name: '冬瓜排骨汤',
    cuisine: '家常',
    tags: ['汤品', '清淡', '补水'],
    suitableFor: ['夏季饮食', '清淡晚餐', '普通家庭'],
    summary: '经典汤品，接受度高，适合晚餐搭配。',
    ingredients: [
      { name: '冬瓜', amount: '250g' },
      { name: '排骨', amount: '180g' },
      { name: '姜片', amount: '2 片' },
      { name: '葱段', amount: '适量' },
    ],
    steps: [
      '排骨焯水后洗净，冬瓜切块备用。',
      '排骨与姜片加水炖 30 分钟左右。',
      '加入冬瓜继续煮 15 分钟至透明软熟。',
      '出锅前少量调味，适合搭配杂粮主食。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/12120312/pexels-photo-12120312.jpeg?cs=srgb&dl=pexels-alexeydemidov-12120312.jpg&fm=jpg',
  },
  {
    name: '芹菜香干',
    cuisine: '家常',
    tags: ['高纤维', '少油', '家常菜'],
    suitableFor: ['控脂饮食', '便秘困扰', '家常搭配'],
    summary: '食材便宜、做法熟悉，适合作为高频预置菜。',
    ingredients: [
      { name: '芹菜', amount: '180g' },
      { name: '香干', amount: '120g' },
      { name: '蒜片', amount: '适量' },
      { name: '食用油', amount: '1 小勺' },
    ],
    steps: [
      '芹菜切段，香干切条备用。',
      '热锅少油爆香蒜片，下香干翻炒出香味。',
      '加入芹菜快速翻炒至断生。',
      '少量调味即可，适合作为高纤维家常配菜。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/31960616/pexels-photo-31960616.jpeg?cs=srgb&dl=pexels-zola-palmer-46102499-31960616.jpg&fm=jpg',
  },
  {
    name: '玉米胡萝卜蒸肉饼',
    cuisine: '家常',
    tags: ['蒸菜', '高蛋白', '家庭餐'],
    suitableFor: ['儿童友好', '中老年人群', '少油饮食'],
    summary: '蒸制方式更稳妥，也更容易和健康目标结合。',
    ingredients: [
      { name: '猪里脊肉末', amount: '180g' },
      { name: '玉米粒', amount: '50g' },
      { name: '胡萝卜末', amount: '40g' },
      { name: '葱姜水', amount: '2 勺' },
    ],
    steps: [
      '肉末加入葱姜水顺时针搅打上劲。',
      '拌入玉米粒和胡萝卜末，整理成圆饼状。',
      '冷水上锅蒸 12 到 15 分钟至熟透。',
      '蒸制更省油，适合家庭长期轮换食用。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/7776548/pexels-photo-7776548.jpeg?cs=srgb&dl=pexels-enginakyurt-7776548.jpg&fm=jpg',
  },
  {
    name: '菠菜豆腐蛋花汤',
    cuisine: '家常',
    tags: ['低脂', '补铁', '晚餐'],
    suitableFor: ['低脂饮食', '需要叶酸补充人群', '清淡收口'],
    summary: '作为清淡收口汤很合适，也更符合日常饮食习惯。',
    ingredients: [
      { name: '菠菜', amount: '120g' },
      { name: '嫩豆腐', amount: '180g' },
      { name: '鸡蛋', amount: '1 个' },
      { name: '姜片', amount: '2 片' },
    ],
    steps: [
      '锅中加水和姜片煮开，放入豆腐块煮 3 分钟。',
      '鸡蛋打散后缓慢倒入，形成蛋花。',
      '加入菠菜煮至断生。',
      '最后少量调味即可，适合作为清淡晚餐配汤。',
    ],
    coverUrl:
      'https://images.pexels.com/photos/6066050/pexels-photo-6066050.jpeg?cs=srgb&dl=pexels-alesiakozik-6066050.jpg&fm=jpg',
  },
];

function normalizeText(value: string | undefined | null): string {
  return (value || '').trim();
}

function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

function normalizeCoverUrlForDisplay(value: string | undefined | null): string {
  const coverUrl = normalizeText(value);
  if (!coverUrl) {
    return '';
  }
  if (coverUrl.startsWith('/static/')) {
    return `${getApiOrigin()}${coverUrl}`;
  }

  try {
    const parsedCoverUrl = new URL(coverUrl);
    const apiUrl = new URL(getApiBaseUrl());
    const isLocalStaticCover =
      parsedCoverUrl.pathname.startsWith('/static/uploads/') &&
      ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsedCoverUrl.hostname);
    if (isLocalStaticCover) {
      parsedCoverUrl.protocol = apiUrl.protocol;
      parsedCoverUrl.host = apiUrl.host;
      return parsedCoverUrl.toString();
    }
  } catch {
    return coverUrl;
  }

  return coverUrl;
}

function normalizeTags(tags: string[] | undefined): string[] {
  return (tags || []).map((tag) => normalizeText(tag)).filter(Boolean);
}

function normalizeIngredients(ingredients: Recipe['ingredients'] | undefined): RecipeIngredient[] {
  return (ingredients || [])
    .map((item) => ({
      name: normalizeText(item?.name),
      amount: normalizeText(item?.amount),
    }))
    .filter((item) => item.name);
}

function normalizeRecommendationIngredients(
  ingredients: AiRecommendationItem['ingredients'] | undefined,
): RecipeIngredient[] {
  return (ingredients || [])
    .map((item) => ({
      name: normalizeText(item?.name),
      amount: normalizeText(item?.amount),
    }))
    .filter((item) => item.name);
}

function normalizeSteps(steps: Recipe['steps'] | undefined): string[] {
  return (steps || []).map((step) => normalizeText(step)).filter(Boolean);
}

function normalizeRecommendationSteps(steps: AiRecommendationItem['steps'] | undefined): string[] {
  return (steps || []).map((step) => normalizeText(step)).filter(Boolean);
}

function buildSummary(name: string, tags: string[], steps: string[]): string {
  if (steps[0]) {
    return steps[0];
  }
  if (tags.length > 0) {
    return `${name}主打${tags.slice(0, 2).join('、')}，适合作为日常健康餐。`;
  }
  return `${name}适合作为日常家常餐，营养均衡且容易上手。`;
}

function isRecommendationHintText(value: string): boolean {
  return [
    '服务器食谱库',
    '本地食谱库',
    '搜索意图',
    '健康档案',
    '口味偏好',
    '候选',
    '命中',
  ].some((keyword) => value.includes(keyword));
}

function normalizeRecipeSummary(value: string | undefined | null): string {
  const summary = normalizeText(value);
  return summary && !isRecommendationHintText(summary) ? summary : '';
}

function normalizeNameForCompare(name: string): string {
  return normalizeText(name).replace(/\s+/g, '').toLowerCase();
}

function normalizeRecipeSource(source: string | undefined): RecipePost['source'] {
  if (source === 'library' || source === 'demo' || source === 'external') {
    return source;
  }
  return 'ai';
}

export const DEMO_RECIPE_POSTS: RecipePost[] = DEMO_RECIPE_BASE.map((item, index) => ({
  ...item,
  id: `demo-${index + 1}`,
  source: 'demo',
  coverIndex: index,
}));

const DEMO_RECIPE_BY_NAME = new Map<string, RecipePost>(
  DEMO_RECIPE_POSTS.map((item) => [normalizeNameForCompare(item.name), item]),
);
const RECIPE_POST_CACHE = new Map<string, RecipePost>();

function findDemoRecipeByName(name: string): RecipePost | undefined {
  return DEMO_RECIPE_BY_NAME.get(normalizeNameForCompare(name));
}

function findRelatedDemoRecipe(
  name: string,
  cuisine: string,
  tags: string[],
  suitableFor: string[],
): RecipePost | undefined {
  const normalizedName = normalizeNameForCompare(name);
  const tagSet = new Set([...tags, ...suitableFor].map((item) => normalizeNameForCompare(item)));
  let bestMatch: RecipePost | undefined;
  let bestScore = -1;

  DEMO_RECIPE_POSTS.forEach((recipe) => {
    let score = 0;
    if (normalizeNameForCompare(recipe.cuisine) === normalizeNameForCompare(cuisine)) {
      score += 2;
    }
    recipe.tags.forEach((tag) => {
      if (tagSet.has(normalizeNameForCompare(tag))) {
        score += 2;
      }
    });
    recipe.suitableFor.forEach((item) => {
      if (tagSet.has(normalizeNameForCompare(item))) {
        score += 1;
      }
    });
    if (normalizedName && normalizeNameForCompare(recipe.name).includes(normalizedName.slice(0, 2))) {
      score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = recipe;
    }
  });

  return bestScore > 0 ? bestMatch : undefined;
}

export function mapLibraryRecipesToPosts(recipes: Recipe[]): RecipePost[] {
  return recipes.map((recipe, index) => {
    const name = normalizeText(recipe.name) || `食谱 ${index + 1}`;
    const cuisine = normalizeText(recipe.cuisine) || '家常';
    const tags = normalizeTags(recipe.tags);
    const suitableFor = normalizeTags(recipe.suitable_for);
    const steps = normalizeSteps(recipe.steps);
    const ingredients = normalizeIngredients(recipe.ingredients);
    const matchedDemoRecipe = findDemoRecipeByName(name) || findRelatedDemoRecipe(name, cuisine, tags, suitableFor);

    return {
      id: `library-${recipe.id}`,
      source: 'library',
      libraryScope: recipe.library_scope || 'server',
      name,
      cuisine,
      tags,
      suitableFor,
      summary: buildSummary(name, tags, steps),
      ingredients,
      steps,
      coverUrl: normalizeCoverUrlForDisplay(recipe.cover_url) || matchedDemoRecipe?.coverUrl,
      sourceUrl: normalizeText(recipe.source_url) || undefined,
      sourceProvider: normalizeText(recipe.source_provider) || undefined,
      coverIndex: Math.abs(Number(recipe.id) || index),
    };
  });
}

export function filterDemoRecipePosts(keyword: string): RecipePost[] {
  const query = normalizeText(keyword).toLowerCase();
  if (!query) {
    return DEMO_RECIPE_POSTS;
  }

  return DEMO_RECIPE_POSTS.filter((recipe) => {
    const searchable = [
      recipe.name,
      recipe.cuisine,
      recipe.summary,
      ...recipe.tags,
      ...recipe.suitableFor,
      ...recipe.ingredients.map((ingredient) => ingredient.name),
    ].join(' ');
    return searchable.toLowerCase().includes(query);
  });
}

export function getDemoRecipeById(recipeId: string): RecipePost | undefined {
  return DEMO_RECIPE_POSTS.find((recipe) => recipe.id === recipeId);
}

export function getCachedRecipePostById(recipeId: string): RecipePost | undefined {
  return RECIPE_POST_CACHE.get(recipeId);
}

export function cacheRecipePosts(posts: RecipePost[]) {
  RECIPE_POST_CACHE.clear();
  posts.forEach((post) => {
    RECIPE_POST_CACHE.set(post.id, post);
  });
}

export function buildRecommendationPosts(
  recommendations: AiRecommendationItem[],
  libraryPosts: RecipePost[],
): RecipePost[] {
  const libraryByName = new Map<string, RecipePost>();
  libraryPosts.forEach((post) => {
    const key = normalizeNameForCompare(post.name);
    const existingPost = libraryByName.get(key);
    if (!existingPost || (post.libraryScope === 'local' && existingPost.libraryScope !== 'local')) {
      libraryByName.set(key, post);
    }
  });

  return recommendations.map((item, index) => {
    const name = normalizeText(item.name) || `AI 推荐食谱 ${index + 1}`;
    const normalizedName = normalizeNameForCompare(name);
    const source = normalizeRecipeSource(item.source);
    const tags = normalizeTags(item.tags);
    const suitableFor = normalizeTags(item.suitable_for);
    const ingredients = normalizeRecommendationIngredients(item.ingredients);
    const steps = normalizeRecommendationSteps(item.steps);
    const coverUrl = normalizeCoverUrlForDisplay(item.cover_url) || undefined;
    const sourceUrl = normalizeText(item.source_url) || undefined;
    const sourceProvider = normalizeText(item.source_provider) || undefined;
    const matchedLibraryPost = libraryByName.get(normalizedName);
    const matchedDemoRecipe =
      source === 'external'
        ? undefined
        : findDemoRecipeByName(name) ||
          findRelatedDemoRecipe(name, normalizeText(item.cuisine), tags, suitableFor);

    if (matchedLibraryPost && source !== 'external') {
      const nextLibraryScope =
        matchedLibraryPost.libraryScope === 'local'
          ? 'local'
          : item.library_scope || matchedLibraryPost.libraryScope;
      return {
        ...matchedLibraryPost,
        libraryScope: nextLibraryScope,
        summary: matchedLibraryPost.summary || normalizeRecipeSummary(item.summary),
        tags: tags.length > 0 ? tags : matchedLibraryPost.tags,
        suitableFor: suitableFor.length > 0 ? suitableFor : matchedLibraryPost.suitableFor,
        ingredients: ingredients.length > 0 ? ingredients : matchedLibraryPost.ingredients,
        steps: steps.length > 0 ? steps : matchedLibraryPost.steps,
        coverUrl: coverUrl || matchedLibraryPost.coverUrl,
        sourceUrl: sourceUrl || matchedLibraryPost.sourceUrl,
        sourceProvider: sourceProvider || matchedLibraryPost.sourceProvider,
      };
    }

    const reason = normalizeText(item.reason);
    const summary = normalizeRecipeSummary(item.summary) || buildSummary(name, tags, steps);
    const nextIngredients = ingredients.length > 0 ? ingredients : matchedDemoRecipe?.ingredients || [];
    const nextSteps =
      steps.length > 0
        ? steps
        : reason
          ? ['按推荐思路准备食材。', reason, '烹调时尽量少油少盐，再按个人口味微调。']
          : matchedDemoRecipe?.steps || ['根据当前健康目标准备食材并完成烹调。'];

    return {
      id:
        source === 'library' && item.recipe_id
          ? `library-${item.recipe_id}`
          : `${source}-${normalizedName || index + 1}`,
      source,
      libraryScope: item.library_scope,
      name,
      cuisine: normalizeText(item.cuisine) || matchedDemoRecipe?.cuisine || 'AI 推荐',
      tags: tags.length > 0 ? tags : matchedDemoRecipe?.tags || [],
      suitableFor: suitableFor.length > 0 ? suitableFor : matchedDemoRecipe?.suitableFor || [],
      summary,
      ingredients: nextIngredients,
      steps: nextSteps,
      coverUrl: coverUrl || matchedDemoRecipe?.coverUrl,
      sourceUrl,
      sourceProvider,
      coverIndex: index,
    };
  });
}

export function mergeRecipePosts(basePosts: RecipePost[], recommendationPosts: RecipePost[]): RecipePost[] {
  const merged = [...basePosts];
  const existingNames = new Set(basePosts.map((post) => normalizeNameForCompare(post.name)));

  recommendationPosts.forEach((post) => {
    const normalizedName = normalizeNameForCompare(post.name);
    if (existingNames.has(normalizedName)) {
      return;
    }
    merged.unshift(post);
    existingNames.add(normalizedName);
  });

  return merged;
}

export function hasRecipeCover(recipe: Pick<RecipePost, 'coverUrl'>): boolean {
  return Boolean(recipe.coverUrl && recipe.coverUrl.trim());
}

export function getRecipeCover(recipe: Pick<RecipePost, 'coverUrl'>): { uri: string } | null {
  if (!hasRecipeCover(recipe)) {
    return null;
  }
  return { uri: normalizeCoverUrlForDisplay(recipe.coverUrl) };
}
