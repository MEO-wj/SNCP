import type { NutritionValues } from '@/types/nutrition';

export type FoodCategory = 'staple' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'snack';
export type FoodIconKey =
  | 'grain'
  | 'meat'
  | 'fish'
  | 'egg'
  | 'leaf'
  | 'fruit'
  | 'drop'
  | 'cookie';

export type FoodCatalogItem = {
  id: string;
  name: string;
  category: FoodCategory;
  icon: FoodIconKey;
  portionHint: string;
  nutritionPer100g: NutritionValues;
};

export const FOOD_CATEGORIES: {
  value: FoodCategory;
  label: string;
  hint: string;
}[] = [
  { value: 'staple', label: '主食', hint: '碳水和基础能量' },
  { value: 'protein', label: '蛋白', hint: '肉蛋豆和海鲜' },
  { value: 'vegetable', label: '蔬菜', hint: '膳食纤维和微量营养' },
  { value: 'fruit', label: '水果', hint: '水果和天然糖分' },
  { value: 'dairy', label: '乳品', hint: '奶和发酵乳' },
  { value: 'snack', label: '加餐', hint: '坚果和轻食' },
];

export const FOOD_WEIGHT_OPTIONS = [50, 80, 100, 120, 150, 200, 250, 300] as const;

export const FOOD_CATALOG: FoodCatalogItem[] = [
  {
    id: 'rice',
    name: '米饭',
    category: 'staple',
    icon: 'grain',
    portionHint: '一小碗约100g',
    nutritionPer100g: { calories: 116, protein: 2.6, fat: 0.3, carbs: 25.9, fiber: 0.3, sodium: 2, sugar: 0.1 },
  },
  {
    id: 'oatmeal',
    name: '燕麦粥',
    category: 'staple',
    icon: 'grain',
    portionHint: '早餐友好',
    nutritionPer100g: { calories: 68, protein: 2.4, fat: 1.4, carbs: 12, fiber: 1.7, sodium: 49, sugar: 0.5 },
  },
  {
    id: 'whole-wheat-bread',
    name: '全麦面包',
    category: 'staple',
    icon: 'grain',
    portionHint: '两片约60g',
    nutritionPer100g: { calories: 247, protein: 12.5, fat: 4.2, carbs: 41.4, fiber: 6.8, sodium: 423, sugar: 5.1 },
  },
  {
    id: 'sweet-potato',
    name: '红薯',
    category: 'staple',
    icon: 'grain',
    portionHint: '蒸煮更稳妥',
    nutritionPer100g: { calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1, fiber: 3, sodium: 55, sugar: 4.2 },
  },
  {
    id: 'corn',
    name: '玉米',
    category: 'staple',
    icon: 'grain',
    portionHint: '一根约180g',
    nutritionPer100g: { calories: 106, protein: 4, fat: 1.2, carbs: 22.8, fiber: 2.9, sodium: 15, sugar: 4.5 },
  },
  {
    id: 'noodles',
    name: '面条',
    category: 'staple',
    icon: 'grain',
    portionHint: '熟面按实际克重',
    nutritionPer100g: { calories: 131, protein: 4.5, fat: 1.6, carbs: 24.9, fiber: 1.4, sodium: 1, sugar: 0.6 },
  },
  {
    id: 'chicken-breast',
    name: '鸡胸肉',
    category: 'protein',
    icon: 'meat',
    portionHint: '高蛋白低脂',
    nutritionPer100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, sodium: 74, sugar: 0 },
  },
  {
    id: 'beef',
    name: '瘦牛肉',
    category: 'protein',
    icon: 'meat',
    portionHint: '铁元素更高',
    nutritionPer100g: { calories: 187, protein: 20.4, fat: 12, carbs: 0, fiber: 0, sodium: 72, sugar: 0 },
  },
  {
    id: 'salmon',
    name: '三文鱼',
    category: 'protein',
    icon: 'fish',
    portionHint: '富含优质脂肪',
    nutritionPer100g: { calories: 208, protein: 20.4, fat: 13.4, carbs: 0, fiber: 0, sodium: 59, sugar: 0 },
  },
  {
    id: 'shrimp',
    name: '虾仁',
    category: 'protein',
    icon: 'fish',
    portionHint: '蛋白密度高',
    nutritionPer100g: { calories: 99, protein: 23.6, fat: 0.3, carbs: 0.9, fiber: 0, sodium: 111, sugar: 0 },
  },
  {
    id: 'egg',
    name: '鸡蛋',
    category: 'protein',
    icon: 'egg',
    portionHint: '一枚约50g',
    nutritionPer100g: { calories: 144, protein: 13.3, fat: 8.8, carbs: 2.8, fiber: 0, sodium: 131, sugar: 0.3 },
  },
  {
    id: 'tofu',
    name: '北豆腐',
    category: 'protein',
    icon: 'egg',
    portionHint: '植物蛋白补充',
    nutritionPer100g: { calories: 81, protein: 8.1, fat: 4.2, carbs: 1.9, fiber: 0.6, sodium: 7, sugar: 0.5 },
  },
  {
    id: 'broccoli',
    name: '西兰花',
    category: 'vegetable',
    icon: 'leaf',
    portionHint: '配餐常用菜',
    nutritionPer100g: { calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6, fiber: 2.6, sodium: 33, sugar: 1.7 },
  },
  {
    id: 'spinach',
    name: '菠菜',
    category: 'vegetable',
    icon: 'leaf',
    portionHint: '焯水后更常见',
    nutritionPer100g: { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2, sodium: 79, sugar: 0.4 },
  },
  {
    id: 'lettuce',
    name: '生菜',
    category: 'vegetable',
    icon: 'leaf',
    portionHint: '适合轻食',
    nutritionPer100g: { calories: 15, protein: 1.4, fat: 0.2, carbs: 2.9, fiber: 1.3, sodium: 28, sugar: 0.8 },
  },
  {
    id: 'tomato',
    name: '西红柿',
    category: 'vegetable',
    icon: 'leaf',
    portionHint: '冷热都常见',
    nutritionPer100g: { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, sodium: 5, sugar: 2.6 },
  },
  {
    id: 'cucumber',
    name: '黄瓜',
    category: 'vegetable',
    icon: 'leaf',
    portionHint: '凉拌常见',
    nutritionPer100g: { calories: 16, protein: 0.7, fat: 0.1, carbs: 3.6, fiber: 0.5, sodium: 2, sugar: 1.7 },
  },
  {
    id: 'apple',
    name: '苹果',
    category: 'fruit',
    icon: 'fruit',
    portionHint: '一只中等约180g',
    nutritionPer100g: { calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, fiber: 2.4, sodium: 1, sugar: 10.4 },
  },
  {
    id: 'banana',
    name: '香蕉',
    category: 'fruit',
    icon: 'fruit',
    portionHint: '运动前后都常见',
    nutritionPer100g: { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, fiber: 2.6, sodium: 1, sugar: 12.2 },
  },
  {
    id: 'blueberry',
    name: '蓝莓',
    category: 'fruit',
    icon: 'fruit',
    portionHint: '加酸奶常用',
    nutritionPer100g: { calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5, fiber: 2.4, sodium: 1, sugar: 10 },
  },
  {
    id: 'milk',
    name: '低脂牛奶',
    category: 'dairy',
    icon: 'drop',
    portionHint: '一杯约250g',
    nutritionPer100g: { calories: 54, protein: 3.4, fat: 1.5, carbs: 5.1, fiber: 0, sodium: 44, sugar: 5.1 },
  },
  {
    id: 'yogurt',
    name: '无糖酸奶',
    category: 'dairy',
    icon: 'drop',
    portionHint: '早餐或加餐',
    nutritionPer100g: { calories: 66, protein: 3.5, fat: 3.2, carbs: 5, fiber: 0, sodium: 52, sugar: 4.7 },
  },
  {
    id: 'almond',
    name: '杏仁',
    category: 'snack',
    icon: 'cookie',
    portionHint: '一把约25g',
    nutritionPer100g: { calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6, fiber: 12.5, sodium: 1, sugar: 4.4 },
  },
  {
    id: 'walnut',
    name: '核桃',
    category: 'snack',
    icon: 'cookie',
    portionHint: '控制份量更重要',
    nutritionPer100g: { calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7, fiber: 6.7, sodium: 2, sugar: 2.6 },
  },
];
