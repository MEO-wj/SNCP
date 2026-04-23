import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppleLogo,
  CaretLeft,
  CaretRight,
  Clock,
  ClockCounterClockwise,
  Coffee,
  Cookie,
  Drop,
  Egg,
  Fire,
  Fish,
  ForkKnife,
  Leaf,
  MagnifyingGlass,
  MoonStars,
  Sparkle,
  SunHorizon,
  Trash,
  X,
  XCircle,
} from 'phosphor-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight, LinearTransition } from 'react-native-reanimated';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import {
  FOOD_CATALOG,
  FOOD_CATEGORIES,
  FOOD_WEIGHT_OPTIONS,
  type FoodCategory,
  type FoodCatalogItem,
  type FoodIconKey,
} from '@/constants/food-catalog';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { createMeal, deleteMeal, fetchMealsByDate } from '@/services/meals';
import { primeNutritionExperience } from '@/services/nutrition-prime';
import { notifyNutritionRefresh } from '@/services/nutrition-refresh';
import type { Meal, MealItem } from '@/types/meal';
import type { NutritionValues } from '@/types/nutrition';
import { formatTimeLabel } from '@/utils/date';
import {
  EMPTY_NUTRITION,
  formatNutritionValue,
  scaleNutrition,
  sumMealItemsNutrition,
  sumMealsNutrition,
  sumNutritionValues,
} from '@/utils/nutrition';

type IconComponent = React.ComponentType<any>;

type MealOption = {
  value: string;
  label: string;
  caption: string;
  icon: IconComponent;
  tint: string;
  surfaceTintLight: string;
  surfaceTintDark: string;
};

const MEAL_OPTIONS: MealOption[] = [
  {
    value: 'breakfast',
    label: '早餐',
    caption: '晨间补能',
    icon: SunHorizon,
    tint: '#E38B2F',
    surfaceTintLight: 'rgba(255, 209, 102, 0.20)',
    surfaceTintDark: 'rgba(255, 209, 102, 0.14)',
  },
  {
    value: 'lunch',
    label: '午餐',
    caption: '主力进食',
    icon: ForkKnife,
    tint: '#D76A4A',
    surfaceTintLight: 'rgba(243, 106, 139, 0.12)',
    surfaceTintDark: 'rgba(243, 106, 139, 0.10)',
  },
  {
    value: 'dinner',
    label: '晚餐',
    caption: '轻盈收口',
    icon: MoonStars,
    tint: '#7A66D9',
    surfaceTintLight: 'rgba(106, 142, 174, 0.16)',
    surfaceTintDark: 'rgba(122, 102, 217, 0.14)',
  },
  {
    value: 'snack',
    label: '加餐',
    caption: '两餐之间',
    icon: Coffee,
    tint: '#4E8C63',
    surfaceTintLight: 'rgba(76, 175, 80, 0.16)',
    surfaceTintDark: 'rgba(76, 175, 80, 0.12)',
  },
];

const DEFAULT_VISIBLE_CATEGORIES = 4;
const DEFAULT_VISIBLE_FOODS = 4;

type WizardStep = 'meal' | 'category' | 'food' | 'weight' | 'review' | 'draft';
type DraftAccessMode = 'after-add' | 'browse' | null;

const WIZARD_STEP_ORDER: WizardStep[] = ['meal', 'category', 'food', 'weight', 'review'];

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = FOOD_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<FoodCategory, string>,
);

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMealOption(value: string) {
  return MEAL_OPTIONS.find((item) => item.value === value) ?? MEAL_OPTIONS[0];
}

function createClientRequestId() {
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function renderFoodIcon(icon: FoodIconKey, color: string, size = 18) {
  switch (icon) {
    case 'fish':
      return <Fish size={size} color={color} weight="duotone" />;
    case 'egg':
      return <Egg size={size} color={color} weight="duotone" />;
    case 'leaf':
      return <Leaf size={size} color={color} weight="duotone" />;
    case 'fruit':
      return <AppleLogo size={size} color={color} weight="duotone" />;
    case 'drop':
      return <Drop size={size} color={color} weight="duotone" />;
    case 'cookie':
      return <Cookie size={size} color={color} weight="duotone" />;
    case 'meat':
      return <Fire size={size} color={color} weight="duotone" />;
    case 'grain':
    default:
      return <CaretRight size={size} color={color} weight="bold" />;
  }
}

function NutritionMetric({
  label,
  value,
  unit,
  styles,
  subtle = false,
}: {
  label: string;
  value: number;
  unit: string;
  styles: ReturnType<typeof createStyles>;
  subtle?: boolean;
}) {
  return (
    <View style={[styles.metricCard, subtle && styles.metricCardSubtle]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {formatNutritionValue(value)}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function MacroChip({
  label,
  value,
  styles,
}: {
  label: string;
  value: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.macroChip}>
      <Text style={styles.macroChipLabel}>{label}</Text>
      <Text style={styles.macroChipValue}>{formatNutritionValue(value)}g</Text>
    </View>
  );
}

export default function RecordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const wizardCardOffsetRef = useRef(0);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [wizardStep, setWizardStep] = useState<WizardStep>('meal');
  const [wizardHistory, setWizardHistory] = useState<WizardStep[]>([]);
  const [wizardDirection, setWizardDirection] = useState<'forward' | 'back'>('forward');
  const [draftAccessMode, setDraftAccessMode] = useState<DraftAccessMode>(null);
  const [mealType, setMealType] = useState('breakfast');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('staple');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<number>(100);
  const [items, setItems] = useState<MealItem[]>([]);
  const [draftRequestId, setDraftRequestId] = useState(() => createClientRequestId());
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [foodPickerVisible, setFoodPickerVisible] = useState(false);
  const [foodPickerCategory, setFoodPickerCategory] = useState<FoodCategory | ''>('staple');
  const [foodPickerKeyword, setFoodPickerKeyword] = useState('');
  const [mealPendingDelete, setMealPendingDelete] = useState<Meal | null>(null);
  const [deleteErrorText, setDeleteErrorText] = useState('');
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);

  const todayKey = useMemo(() => getTodayKey(), []);

  const visibleFoods = useMemo(
    () => FOOD_CATALOG.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );
  const displayedCategories = useMemo(
    () => (showAllCategories ? FOOD_CATEGORIES : FOOD_CATEGORIES.slice(0, DEFAULT_VISIBLE_CATEGORIES)),
    [showAllCategories],
  );
  const hiddenCategoryCount = FOOD_CATEGORIES.length - displayedCategories.length;
  const displayedFoods = useMemo(() => visibleFoods.slice(0, DEFAULT_VISIBLE_FOODS), [visibleFoods]);
  const hiddenFoodCount = visibleFoods.length - displayedFoods.length;
  const foodsByPickerCategory = useMemo(() => {
    const keyword = normalizeKeyword(foodPickerKeyword);
    return FOOD_CATEGORIES.map((category) => ({
      ...category,
      foods: FOOD_CATALOG.filter((item) => item.category === category.value).filter((item) => {
        return !keyword || normalizeKeyword(`${item.name}${item.portionHint}${item.id}`).includes(keyword);
      }),
    })).filter((category) => !keyword || category.foods.length > 0);
  }, [foodPickerKeyword]);

  useEffect(() => {
    if (visibleFoods.length === 0) {
      setSelectedFoodId('');
      return;
    }
    if (selectedFoodId && !visibleFoods.some((item) => item.id === selectedFoodId)) {
      setSelectedFoodId('');
    }
  }, [selectedFoodId, visibleFoods]);

  const selectedFood = useMemo(
    () => visibleFoods.find((item) => item.id === selectedFoodId) ?? null,
    [selectedFoodId, visibleFoods],
  );

  const loadMeals = useCallback(async () => {
    if (!token) {
      setMeals([]);
      setErrorText('登录状态失效，请重新登录后再同步餐次。');
      return [] as Meal[];
    }
    try {
      const res = await fetchMealsByDate(todayKey, token);
      const nextMeals = res.meals || [];
      setMeals(nextMeals);
      setErrorText('');
      return nextMeals;
    } catch (error) {
      console.error('[Meals] load failed', error);
      setErrorText(error instanceof Error ? error.message : '获取餐次失败，请检查后端服务。');
      return [] as Meal[];
    }
  }, [todayKey, token]);

  useFocusEffect(
    useCallback(() => {
      void loadMeals();
    }, [loadMeals]),
  );

  const selectedPortionNutrition = useMemo<NutritionValues>(() => {
    if (!selectedFood) {
      return EMPTY_NUTRITION;
    }
    return scaleNutrition(selectedFood.nutritionPer100g, selectedWeight);
  }, [selectedFood, selectedWeight]);

  const draftTotals = useMemo(() => sumMealItemsNutrition(items), [items]);
  const todayTotals = useMemo(() => sumMealsNutrition(meals), [meals]);
  const projectedTotals = useMemo(
    () => sumNutritionValues(todayTotals, draftTotals),
    [draftTotals, todayTotals],
  );
  const currentMealOption = useMemo(() => getMealOption(mealType), [mealType]);
  const selectedCategoryOption = useMemo(
    () => FOOD_CATEGORIES.find((item) => item.value === selectedCategory) ?? FOOD_CATEGORIES[0],
    [selectedCategory],
  );
  const wizardProgressIndex = useMemo(() => {
    const index = WIZARD_STEP_ORDER.indexOf(wizardStep);
    return index >= 0 ? index + 1 : WIZARD_STEP_ORDER.length;
  }, [wizardStep]);
  const wizardMeta = useMemo(() => {
    switch (wizardStep) {
      case 'meal':
        return { eyebrow: `步骤 1/${WIZARD_STEP_ORDER.length}`, title: '先选餐次', subtitle: '这一餐属于早餐、午餐、晚餐还是加餐？' };
      case 'category':
        return { eyebrow: `步骤 2/${WIZARD_STEP_ORDER.length}`, title: '再选食物分类', subtitle: '分类单独成页，避免一屏同时塞太多内容。' };
      case 'food':
        return { eyebrow: `步骤 3/${WIZARD_STEP_ORDER.length}`, title: '挑一个食物', subtitle: '默认先给常用项，需要时再展开更多。' };
      case 'weight':
        return { eyebrow: `步骤 4/${WIZARD_STEP_ORDER.length}`, title: '确认重量', subtitle: '这一页只处理克重，减少误触。' };
      case 'review':
        return { eyebrow: `步骤 5/${WIZARD_STEP_ORDER.length}`, title: '加入本餐', subtitle: '最后确认一次，再把这项食物加入当前餐次。' };
      case 'draft':
      default:
        return { eyebrow: '本餐草稿', title: '查看待保存内容', subtitle: '这里汇总已经加入的食物，可以继续添加，也可以直接保存。' };
    }
  }, [wizardStep]);
  const wizardContextPills = useMemo(() => {
    const pills: string[] = [];
    if (wizardStep !== 'meal') {
      pills.push(currentMealOption.label);
    }
    if (['food', 'weight', 'review'].includes(wizardStep)) {
      pills.push(selectedCategoryOption.label);
    }
    if (selectedFood && ['weight', 'review'].includes(wizardStep)) {
      pills.push(selectedFood.name);
    }
    if (wizardStep === 'review') {
      pills.push(`${selectedWeight}g`);
    }
    if (wizardStep === 'draft' && items.length > 0) {
      pills.push(`${items.length} 项食物`);
    }
    return pills;
  }, [currentMealOption.label, items.length, selectedCategoryOption.label, selectedFood, selectedWeight, wizardStep]);
  const wizardStageMinHeight = useMemo(() => {
    switch (wizardStep) {
      case 'meal':
        return 228;
      case 'category':
        return 220;
      case 'food':
        return 320;
      case 'weight':
        return 248;
      case 'review':
        return 236;
      case 'draft':
      default:
        return 0;
    }
  }, [wizardStep]);
  const canGoBack = wizardHistory.length > 0 && !(wizardStep === 'draft' && draftAccessMode === 'after-add');
  const wizardEntering = wizardDirection === 'forward' ? FadeInRight.duration(220) : FadeInLeft.duration(220);
  const wizardExiting = wizardDirection === 'forward' ? FadeOutLeft.duration(180) : FadeOutRight.duration(180);
  const pendingDeleteOption = useMemo(
    () => (mealPendingDelete ? getMealOption(mealPendingDelete.meal_type) : null),
    [mealPendingDelete],
  );
  const pendingDeleteTotals = useMemo(
    () => (mealPendingDelete ? sumMealItemsNutrition(mealPendingDelete.items || []) : EMPTY_NUTRITION),
    [mealPendingDelete],
  );
  const PendingDeleteIcon = pendingDeleteOption?.icon;

  const resetDraft = useCallback(() => {
    setItems([]);
    setDraftRequestId(createClientRequestId());
  }, []);

  const scrollToWizardCard = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const y = Math.max(0, wizardCardOffsetRef.current - 20);
        scrollViewRef.current?.scrollTo({ y, animated: true });
      }, 80);
    });
  }, []);

  const navigateWizard = useCallback(
    (nextStep: WizardStep, options?: { resetHistory?: boolean; draftMode?: DraftAccessMode; keepDirection?: boolean }) => {
      setWizardDirection(options?.keepDirection ? wizardDirection : 'forward');
      setDraftAccessMode(options?.draftMode ?? null);
      setWizardHistory((prev) => (options?.resetHistory ? [] : [...prev, wizardStep]));
      setWizardStep(nextStep);
      scrollToWizardCard();
    },
    [scrollToWizardCard, wizardDirection, wizardStep],
  );

  const handleWizardBack = useCallback(() => {
    if (!canGoBack) {
      return;
    }
    const nextHistory = [...wizardHistory];
    const previousStep = nextHistory.pop();
    if (!previousStep) {
      return;
    }
    setWizardDirection('back');
    setWizardHistory(nextHistory);
    setWizardStep(previousStep);
    if (wizardStep === 'draft') {
      setDraftAccessMode(null);
    }
    scrollToWizardCard();
  }, [canGoBack, scrollToWizardCard, wizardHistory, wizardStep]);

  const addDraftItem = useCallback((food: FoodCatalogItem, weight: number) => {
    if (saving) {
      return;
    }
    setErrorText('');
    setDraftRequestId(createClientRequestId());
    setItems((prev) => [
      ...prev,
      {
        food_name: food.name,
        food_category: FOOD_CATEGORY_LABELS[food.category],
        weight_g: weight,
        source: 'catalog',
        nutrition: food.nutritionPer100g,
      },
    ]);
  }, [saving]);

  const handleMealTypeSelect = useCallback(
    (value: string) => {
      if (saving) {
        return;
      }
      setMealType(value);
      setDraftRequestId(createClientRequestId());
      navigateWizard('category');
    },
    [navigateWizard, saving],
  );

  const handleCategorySelect = useCallback(
    (value: FoodCategory) => {
      if (saving) {
        return;
      }
      if (value === selectedCategory) {
        navigateWizard('food');
        return;
      }
      setSelectedCategory(value);
      setSelectedFoodId('');
      navigateWizard('food');
    },
    [navigateWizard, saving, selectedCategory],
  );

  const handleFoodSelect = useCallback(
    (foodId: string) => {
      if (saving) {
        return;
      }
      setSelectedFoodId(foodId);
      navigateWizard('weight');
    },
    [navigateWizard, saving],
  );

  const handleWeightSelect = useCallback(
    (weight: number) => {
      if (saving) {
        return;
      }
      setSelectedWeight(weight);
      if (!selectedFood) {
        navigateWizard('food');
        return;
      }
      navigateWizard('review');
    },
    [navigateWizard, saving, selectedFood],
  );

  const handleShowMoreCategories = useCallback(() => {
    setShowAllCategories(true);
  }, []);

  const handleShowMoreFoods = useCallback(() => {
    setFoodPickerCategory(selectedCategory);
    setFoodPickerKeyword('');
    setFoodPickerVisible(true);
  }, [selectedCategory]);

  const closeFoodPicker = useCallback(() => {
    setFoodPickerVisible(false);
    setFoodPickerKeyword('');
    setFoodPickerCategory(selectedCategory);
  }, [selectedCategory]);

  const handleFoodPickerSelect = useCallback(
    (food: FoodCatalogItem) => {
      if (saving) {
        return;
      }
      setSelectedCategory(food.category);
      setSelectedFoodId(food.id);
      setSelectedWeight(food.defaultWeightG);
      setFoodPickerVisible(false);
      setFoodPickerKeyword('');
      setFoodPickerCategory(food.category);
      navigateWizard('weight');
    },
    [navigateWizard, saving],
  );

  const handleOpenDraft = useCallback(() => {
    if (items.length === 0 || wizardStep === 'draft') {
      return;
    }
    navigateWizard('draft', { draftMode: 'browse' });
  }, [items.length, navigateWizard, wizardStep]);

  const handleAddCurrentSelection = useCallback(() => {
    if (!selectedFood || saving) {
      return;
    }
    addDraftItem(selectedFood, selectedWeight);
    setSelectedFoodId('');
    setDraftAccessMode('after-add');
    setWizardDirection('forward');
    setWizardHistory([]);
    setWizardStep('draft');
    scrollToWizardCard();
  }, [addDraftItem, saving, scrollToWizardCard, selectedFood, selectedWeight]);

  const handleContinueAdding = useCallback(() => {
    setDraftAccessMode(null);
    setWizardDirection('forward');
    setWizardHistory(['meal']);
    setWizardStep('category');
    scrollToWizardCard();
  }, [scrollToWizardCard]);

  const handleRemoveDraftItem = (index: number) => {
    if (saving) {
      return;
    }
    setDraftRequestId(createClientRequestId());
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorText('当前未登录，无法保存餐次。');
      return;
    }
    if (items.length === 0 || saving) {
      return;
    }
    setSaving(true);
    setErrorText('');
    try {
      await createMeal(
        {
          meal_type: mealType,
          eaten_at: new Date().toISOString(),
          client_request_id: draftRequestId,
          items,
        },
        token,
      );
      resetDraft();
      setSelectedFoodId('');
      setSelectedWeight(100);
      setDraftAccessMode(null);
      setWizardDirection('forward');
      setWizardHistory([]);
      setWizardStep('meal');
      await loadMeals();
      notifyNutritionRefresh('meals');
      void primeNutritionExperience(token);
    } catch (error) {
      console.error('[Meals] create failed', error);
      const latestMeals = await loadMeals();
      const saved = latestMeals.some((meal) => meal.client_request_id === draftRequestId);
      if (saved) {
        resetDraft();
        setSelectedFoodId('');
        setSelectedWeight(100);
        setDraftAccessMode(null);
        setWizardDirection('forward');
        setWizardHistory([]);
        setWizardStep('meal');
        setErrorText('');
        return;
      }
      setErrorText(error instanceof Error ? error.message : '保存餐次失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteModal = useCallback(() => {
    if (deletingMealId !== null) {
      return;
    }
    setMealPendingDelete(null);
    setDeleteErrorText('');
  }, [deletingMealId]);

  const performDeleteMeal = useCallback(
    async (meal: Meal) => {
      if (!token || deletingMealId !== null) {
        return;
      }

      setDeleteErrorText('');
      setDeletingMealId(meal.id);
      try {
        await deleteMeal(meal.id, token);
        setMealPendingDelete(null);
        await loadMeals();
        notifyNutritionRefresh('meals');
        void primeNutritionExperience(token);
      } catch (error) {
        console.error('[Meals] delete failed', error);
        setDeleteErrorText(error instanceof Error ? error.message : '删除餐次失败，请稍后重试');
      } finally {
        setDeletingMealId(null);
      }
    },
    [deletingMealId, loadMeals, token],
  );

  const handleDeleteMeal = useCallback(
    (meal: Meal) => {
      if (!token || deletingMealId !== null) {
        return;
      }
      setDeleteErrorText('');
      setMealPendingDelete(meal);
    },
    [deletingMealId, token],
  );

  const confirmDeleteMeal = useCallback(async () => {
    if (!mealPendingDelete || deletingMealId !== null) {
      return;
    }

    await performDeleteMeal(mealPendingDelete);
  }, [deletingMealId, mealPendingDelete, performDeleteMeal]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
        <Text style={styles.title}>饮食记录</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroEyebrow}>今日累计</Text>
              <Text style={styles.heroTitle}>录一餐，首页和趋势页就会同步更新</Text>
            </View>
            <View style={styles.heroBadge}>
              <Sparkle size={14} color={palette.orange500} weight="fill" />
              <Text style={styles.heroBadgeText}>{meals.length} 餐已记录</Text>
            </View>
            </View>

          <View style={styles.metricGrid}>
            <NutritionMetric label="热量" value={todayTotals.calories} unit="kcal" styles={styles} />
            <NutritionMetric label="蛋白" value={todayTotals.protein} unit="g" styles={styles} />
            <NutritionMetric label="脂肪" value={todayTotals.fat} unit="g" styles={styles} />
            <NutritionMetric label="碳水" value={todayTotals.carbs} unit="g" styles={styles} />
          </View>

          {items.length > 0 ? (
            <View style={styles.projectionStrip}>
              <Text style={styles.projectionLabel}>保存本餐后预计</Text>
              <Text style={styles.projectionValue}>
                {Math.round(projectedTotals.calories)} kcal · 蛋白 {formatNutritionValue(projectedTotals.protein)}g · 碳水{' '}
                {formatNutritionValue(projectedTotals.carbs)}g
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.aiEntryCard}>
          <View style={styles.aiEntryCopy}>
            <Text style={styles.aiEntryEyebrow}>AI 识别</Text>
            <Text style={styles.aiEntryTitle}>拍照导入餐次</Text>
            <Text style={styles.aiEntryText}>
              识别流程会先估计食物和份量，再映射到营养库，适合快速演示和补录。
            </Text>
          </View>
          <Pressable style={styles.aiEntryButton} onPress={() => router.push('/ai-recognize')}>
            <Sparkle size={16} color={palette.white} weight="fill" />
            <Text style={styles.aiEntryButtonText}>去识别</Text>
          </Pressable>
        </View>

        <View
          style={styles.card}
          onLayout={(event) => {
            wizardCardOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.cardTitle}>选择录入</Text>
          <Text style={styles.cardHint}>一步只看一个决策页，选完当前页再进入下一页。</Text>

          <View style={styles.wizardShell}>
            <View style={styles.wizardHeader}>
              <View style={styles.wizardHeaderTopRow}>
                {canGoBack ? (
                  <Pressable style={styles.wizardBackButton} onPress={handleWizardBack}>
                    <CaretLeft size={16} color={palette.stone700} weight="bold" />
                    <Text style={styles.wizardBackButtonText}>上一步</Text>
                  </Pressable>
                ) : (
                  <View style={styles.wizardBackPlaceholder} />
                )}

                {items.length > 0 && wizardStep !== 'draft' ? (
                  <Pressable style={styles.wizardDraftButton} onPress={handleOpenDraft}>
                    <Text style={styles.wizardDraftButtonText}>草稿 {items.length} 项</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.wizardEyebrow}>{wizardMeta.eyebrow}</Text>
              <Text style={styles.wizardTitle}>{wizardMeta.title}</Text>
              <Text style={styles.wizardSubtitle}>{wizardMeta.subtitle}</Text>

              {wizardStep !== 'draft' ? (
                <View style={styles.wizardProgressRow}>
                  {WIZARD_STEP_ORDER.map((step, index) => {
                    const active = step === wizardStep;
                    const completed = index < wizardProgressIndex - 1;
                    return (
                      <View
                        key={step}
                        style={[
                          styles.wizardProgressDot,
                          completed && styles.wizardProgressDotCompleted,
                          active && styles.wizardProgressDotActive,
                        ]}
                      />
                    );
                  })}
                </View>
              ) : null}

              {wizardContextPills.length > 0 ? (
                <View style={styles.wizardContextRow}>
                  {wizardContextPills.map((pill) => (
                    <View key={pill} style={styles.wizardContextPill}>
                      <Text style={styles.wizardContextPillText}>{pill}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Animated.View style={[styles.wizardStage, { minHeight: wizardStageMinHeight }]} layout={LinearTransition.duration(220)}>
              <Animated.View
                key={`${wizardStep}-${draftAccessMode ?? 'default'}`}
                entering={wizardEntering}
                exiting={wizardExiting}
                style={styles.wizardPane}
              >
                {wizardStep === 'meal' ? (
                  <View style={styles.mealTypeRow}>
                    {MEAL_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = mealType === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.mealTypeCard,
                            active && {
                              borderColor: option.tint,
                              backgroundColor: isDark ? option.surfaceTintDark : option.surfaceTintLight,
                            },
                          ]}
                          onPress={() => handleMealTypeSelect(option.value)}
                        >
                          <View style={[styles.mealTypeIconWrap, active && { backgroundColor: option.tint }]}>
                            <Icon
                              size={18}
                              color={active ? (isDark ? palette.surface : palette.white) : option.tint}
                              weight="fill"
                            />
                          </View>
                          <Text style={styles.mealTypeTitle}>{option.label}</Text>
                          <Text style={styles.mealTypeCaption}>{option.caption}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {wizardStep === 'category' ? (
                  <View>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>食物分类</Text>
                      {hiddenCategoryCount > 0 ? (
                        <Pressable style={styles.sectionMoreButton} onPress={handleShowMoreCategories}>
                          <Text style={styles.sectionMoreButtonText}>更多分类 +{hiddenCategoryCount}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.categoryGrid}>
                      {displayedCategories.map((category) => {
                        const active = selectedCategory === category.value;
                        return (
                          <Pressable
                            key={category.value}
                            style={[styles.categoryChip, active && styles.categoryChipActive]}
                            onPress={() => handleCategorySelect(category.value)}
                          >
                            <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                              {category.label}
                            </Text>
                            <Text style={[styles.categoryChipHint, active && styles.categoryChipHintActive]}>
                              {category.hint}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {wizardStep === 'food' ? (
                  <View>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>{selectedCategoryOption.label}</Text>
                      {hiddenFoodCount > 0 ? (
                        <Pressable style={styles.sectionMoreButton} onPress={handleShowMoreFoods}>
                          <Text style={styles.sectionMoreButtonText}>更多食物 +{hiddenFoodCount}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.foodGrid}>
                      {displayedFoods.map((food) => {
                        const active = selectedFood?.id === food.id;
                        return (
                          <Pressable
                            key={food.id}
                            style={[styles.foodCard, active && styles.foodCardActive]}
                            onPress={() => handleFoodSelect(food.id)}
                          >
                            <View style={[styles.foodIconWrap, active && styles.foodIconWrapActive]}>
                              {renderFoodIcon(
                                food.icon,
                                active ? (isDark ? palette.surface : palette.white) : palette.orange500,
                                18,
                              )}
                            </View>
                            <Text style={styles.foodName}>{food.name}</Text>
                            <Text style={styles.foodHint}>{food.portionHint}</Text>
                            <Text style={styles.foodMacro}>
                              蛋白 {formatNutritionValue(food.nutritionPer100g.protein)}g / 100g
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {wizardStep === 'weight' && selectedFood ? (
                  <View>
                    <View style={styles.selectionPreview}>
                      <View style={styles.selectionPreviewHeader}>
                        <View>
                          <Text style={styles.selectionPreviewTitle}>{selectedFood.name}</Text>
                          <Text style={styles.selectionPreviewHint}>{selectedFood.portionHint}</Text>
                        </View>
                        <View style={styles.selectionPreviewBadge}>
                          <Text style={styles.selectionPreviewBadgeText}>{selectedWeight}g</Text>
                        </View>
                      </View>
                      <View style={styles.metricGrid}>
                        <NutritionMetric label="热量" value={selectedPortionNutrition.calories} unit="kcal" styles={styles} subtle />
                        <NutritionMetric label="蛋白" value={selectedPortionNutrition.protein} unit="g" styles={styles} subtle />
                        <NutritionMetric label="脂肪" value={selectedPortionNutrition.fat} unit="g" styles={styles} subtle />
                        <NutritionMetric label="碳水" value={selectedPortionNutrition.carbs} unit="g" styles={styles} subtle />
                      </View>
                    </View>

                    <Text style={styles.sectionLabel}>选择重量</Text>
                    <View style={styles.weightRow}>
                      {FOOD_WEIGHT_OPTIONS.map((weight) => {
                        const active = selectedWeight === weight;
                        return (
                          <Pressable
                            key={weight}
                            style={[styles.weightChip, active && styles.weightChipActive]}
                            onPress={() => handleWeightSelect(weight)}
                          >
                            <Text style={[styles.weightChipText, active && styles.weightChipTextActive]}>{weight}g</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {wizardStep === 'review' && selectedFood ? (
                  <View style={styles.reviewWrap}>
                    <View style={styles.selectionPreview}>
                      <View style={styles.selectionPreviewHeader}>
                        <View>
                          <Text style={styles.selectionPreviewTitle}>{selectedFood.name}</Text>
                          <Text style={styles.selectionPreviewHint}>
                            {currentMealOption.label} · {selectedCategoryOption.label}
                          </Text>
                        </View>
                        <View style={styles.selectionPreviewBadge}>
                          <Text style={styles.selectionPreviewBadgeText}>{selectedWeight}g</Text>
                        </View>
                      </View>
                      <View style={styles.metricGrid}>
                        <NutritionMetric label="热量" value={selectedPortionNutrition.calories} unit="kcal" styles={styles} subtle />
                        <NutritionMetric label="蛋白" value={selectedPortionNutrition.protein} unit="g" styles={styles} subtle />
                        <NutritionMetric label="脂肪" value={selectedPortionNutrition.fat} unit="g" styles={styles} subtle />
                        <NutritionMetric label="碳水" value={selectedPortionNutrition.carbs} unit="g" styles={styles} subtle />
                      </View>
                    </View>

                    <Pressable style={styles.primaryButton} onPress={handleAddCurrentSelection}>
                      <Text style={styles.primaryButtonText}>加入本餐</Text>
                    </Pressable>

                    {items.length > 0 ? (
                      <Pressable style={styles.secondaryButton} onPress={handleOpenDraft}>
                        <Text style={styles.secondaryButtonText}>先看草稿</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {wizardStep === 'draft' ? (
                  <View style={styles.draftCard}>
                    <View style={styles.draftHeader}>
                      <View>
                        <Text style={styles.draftTitle}>本餐草稿</Text>
                        <Text style={styles.draftHint}>这里是待保存的餐次内容，确认后统一提交。</Text>
                      </View>
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>{items.length} 项</Text>
                      </View>
                    </View>

                    {items.length === 0 ? (
                      <View style={styles.emptyDraftState}>
                        <Text style={styles.emptyText}>还没有加入食物，回到选择流程继续添加。</Text>
                        <Pressable style={styles.secondaryButton} onPress={handleContinueAdding}>
                          <Text style={styles.secondaryButtonText}>重新选择食物</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.draftList}>
                        {items.map((item, index) => {
                          const actualNutrition = scaleNutrition(item.nutrition, item.weight_g);
                          return (
                            <View key={`${item.food_name}-${index}`} style={styles.draftItemRow}>
                              <View style={styles.draftItemMain}>
                                <Text style={styles.draftItemTitle}>
                                  {item.food_name} · {item.weight_g || 0}g
                                </Text>
                                <Text style={styles.draftItemMeta}>
                                  蛋白 {formatNutritionValue(actualNutrition.protein)}g · 脂肪 {formatNutritionValue(actualNutrition.fat)}g · 碳水{' '}
                                  {formatNutritionValue(actualNutrition.carbs)}g
                                </Text>
                              </View>
                              <Pressable onPress={() => handleRemoveDraftItem(index)}>
                                <XCircle size={20} color={palette.imperial500} weight="duotone" />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    <View style={styles.draftMacros}>
                      <MacroChip label="蛋白" value={draftTotals.protein} styles={styles} />
                      <MacroChip label="脂肪" value={draftTotals.fat} styles={styles} />
                      <MacroChip label="碳水" value={draftTotals.carbs} styles={styles} />
                      <MacroChip label="热量" value={draftTotals.calories} styles={styles} />
                    </View>

                    {items.length > 0 ? (
                      <Pressable style={styles.secondaryButton} onPress={handleContinueAdding}>
                        <Text style={styles.secondaryButtonText}>继续添加食物</Text>
                      </Pressable>
                    ) : null}

                    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

                    <Pressable
                      style={[styles.primaryButton, (items.length === 0 || saving) && styles.primaryButtonDisabled]}
                      onPress={handleSubmit}
                      disabled={items.length === 0 || saving}
                    >
                      <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存餐次'}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.savedHeader}>
            <View>
              <Text style={styles.cardTitle}>今日餐次</Text>
              <Text style={styles.cardHint}>每一餐都会显示时间、营养概览和食物组成。</Text>
            </View>
            <View style={styles.savedHeaderActions}>
            <Pressable style={styles.historyEntryButton} onPress={() => router.push('/meal-history')}>
              <ClockCounterClockwise size={14} color={palette.orange500} weight="bold" />
              <Text style={styles.historyEntryButtonText}>历史卡片</Text>
            </Pressable>
            <View style={styles.savedBadge}>
              <Clock size={14} color={palette.blue500} weight="duotone" />
              <Text style={styles.savedBadgeText}>{meals.length} 张卡片</Text>
            </View>
          </View>
          </View>
          {meals.length === 0 ? (
            <Text style={styles.emptyText}>今天还没有记录，先在上面挑一餐试试。</Text>
          ) : (
            <View style={styles.savedList}>
              {meals.map((meal) => {
                const option = getMealOption(meal.meal_type);
                const Icon = option.icon;
                const totals = sumMealItemsNutrition(meal.items || []);
                return (
                  <View key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealCardHeader}>
                      <View style={styles.mealCardMain}>
                        <View
                          style={[
                            styles.mealCardIconWrap,
                            { backgroundColor: isDark ? option.surfaceTintDark : option.surfaceTintLight },
                          ]}
                        >
                          <Icon size={18} color={option.tint} weight="fill" />
                        </View>
                        <View>
                          <Text style={styles.mealCardTitle}>{option.label}</Text>
                          <Text style={styles.mealCardTime}>{formatTimeLabel(meal.eaten_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.mealCardActions}>
                        <View style={styles.mealCardCalories}>
                          <Fire size={14} color={palette.orange500} weight="fill" />
                          <Text style={styles.mealCardCaloriesText}>{Math.round(totals.calories)} kcal</Text>
                        </View>
                        <Pressable
                          style={[
                            styles.mealCardDeleteButton,
                            deletingMealId !== null && styles.mealCardDeleteButtonDisabled,
                          ]}
                          onPress={() => handleDeleteMeal(meal)}
                          disabled={deletingMealId !== null}
                        >
                          <Trash size={14} color={palette.imperial500} weight="bold" />
                          <Text style={styles.mealCardDeleteText}>删除</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.mealCardMacros}>
                      <MacroChip label="蛋白" value={totals.protein} styles={styles} />
                      <MacroChip label="脂肪" value={totals.fat} styles={styles} />
                      <MacroChip label="碳水" value={totals.carbs} styles={styles} />
                    </View>

                    <View style={styles.mealItemWrap}>
                      {(meal.items || []).map((item, index) => (
                        <View key={`${meal.id}-${item.food_name}-${index}`} style={styles.mealItemPill}>
                          <Text style={styles.mealItemPillText}>
                            {item.food_name} {item.weight_g ? `${item.weight_g}g` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      <BottomDock
        activeTab="record"
        onHome={() => router.replace('/(tabs)')}
        onRecord={() => router.replace('/(tabs)/record')}
        onRecommend={() => router.replace('/(tabs)/recommend')}
        onTrend={() => router.replace('/(tabs)/trend')}
        onProfile={() => router.replace('/(tabs)/settings')}
      />
      {foodPickerVisible ? (
        <View style={styles.foodPickerModalMask}>
          <Pressable style={styles.foodPickerModalBackdrop} onPress={closeFoodPicker} />
          <View style={styles.foodPickerSheet}>
            <View style={styles.foodPickerHandle} />
            <View style={styles.foodPickerHeader}>
              <View style={styles.foodPickerHeaderCopy}>
                <Text style={styles.foodPickerTitle}>选择食物</Text>
                <Text style={styles.foodPickerSubtitle}>从同一份食物目录里选择，选中后进入重量确认。</Text>
              </View>
              <Pressable style={styles.foodPickerCloseButton} onPress={closeFoodPicker}>
                <X size={16} color={palette.stone700} weight="bold" />
              </Pressable>
            </View>
            <View style={styles.foodPickerSearchBox}>
              <MagnifyingGlass size={16} color={palette.stone500} weight="bold" />
              <TextInput
                style={styles.foodPickerSearchInput}
                value={foodPickerKeyword}
                onChangeText={setFoodPickerKeyword}
                placeholder="搜索食物"
                placeholderTextColor={palette.stone400}
              />
            </View>
            <ScrollView contentContainerStyle={styles.foodPickerContent} keyboardShouldPersistTaps="handled">
              <View style={styles.foodPickerList}>
                {foodsByPickerCategory.length === 0 ? <Text style={styles.foodPickerHelper}>没有匹配结果，换个关键词试试。</Text> : null}
                {foodsByPickerCategory.map((category) => {
                  const active = foodPickerCategory === category.value;
                  return (
                    <View key={category.value} style={styles.foodPickerCategoryBlock}>
                      <Pressable
                        style={[styles.foodPickerCategoryCard, active && styles.foodPickerCategoryCardActive]}
                        onPress={() => setFoodPickerCategory(active ? '' : category.value)}
                      >
                        <View style={styles.foodPickerCategoryHeader}>
                          <View style={styles.foodPickerCategoryText}>
                            <Text style={[styles.foodPickerCategoryName, active && styles.foodPickerCategoryNameActive]}>{category.label}</Text>
                            <Text style={styles.foodPickerCategoryHint}>{category.hint}</Text>
                          </View>
                          <Text style={[styles.foodPickerCategoryCount, active && styles.foodPickerCategoryCountActive]}>{category.foods.length} 项</Text>
                        </View>
                      </Pressable>
                      {active ? (
                        <View style={styles.foodPickerFoodList}>
                          {category.foods.map((food) => (
                            <Pressable key={food.id} style={styles.foodPickerFoodRow} onPress={() => handleFoodPickerSelect(food)}>
                              <View style={styles.foodPickerFoodIcon}>{renderFoodIcon(food.icon, palette.orange500, 18)}</View>
                              <View style={styles.foodPickerFoodMain}>
                                <Text style={styles.foodPickerFoodName}>{food.name}</Text>
                                <Text style={styles.foodPickerFoodMeta}>{FOOD_CATEGORY_LABELS[food.category]} · 默认 {food.defaultWeightG}g</Text>
                                <Text style={styles.foodPickerFoodHint}>{food.portionHint}</Text>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
      {mealPendingDelete ? (
        <View style={styles.deleteModalMask}>
          <View style={styles.deleteModalBackdrop} />
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalIconWrap}>
                <Trash size={22} color={palette.imperial500} weight="fill" />
              </View>
              <View style={styles.deleteModalTextWrap}>
                <Text style={styles.deleteModalEyebrow}>危险操作</Text>
                <Text style={styles.deleteModalTitle}>删除餐次</Text>
                <Text style={styles.deleteModalMessage}>
                  删除后无法恢复，这条餐次记录里的食物和营养统计会一起移除。
                </Text>
              </View>
            </View>

            {mealPendingDelete && pendingDeleteOption && PendingDeleteIcon ? (
              <View style={styles.deleteSummaryCard}>
                <View style={styles.deleteSummaryHeader}>
                  <View style={styles.deleteSummaryMain}>
                    <View
                      style={[
                        styles.deleteSummaryIconWrap,
                        {
                          backgroundColor: isDark
                            ? pendingDeleteOption.surfaceTintDark
                            : pendingDeleteOption.surfaceTintLight,
                        },
                      ]}
                    >
                      <PendingDeleteIcon size={18} color={pendingDeleteOption.tint} weight="fill" />
                    </View>
                    <View style={styles.deleteSummaryTextWrap}>
                      <Text style={styles.deleteSummaryTitle}>{pendingDeleteOption.label}</Text>
                      <Text style={styles.deleteSummarySubtitle}>
                        {formatTimeLabel(mealPendingDelete.eaten_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.deleteSummaryCalories}>
                    <Fire size={14} color={palette.orange500} weight="fill" />
                    <Text style={styles.deleteSummaryCaloriesText}>
                      {Math.round(pendingDeleteTotals.calories)} kcal
                    </Text>
                  </View>
                </View>

                <View style={styles.deleteSummaryMetaRow}>
                  <View style={styles.deleteSummaryMetaPill}>
                    <Text style={styles.deleteSummaryMetaPillText}>
                      {mealPendingDelete.items.length} 项食物
                    </Text>
                  </View>
                  <View style={styles.deleteSummaryMetaPill}>
                    <Text style={styles.deleteSummaryMetaPillText}>
                      蛋白 {formatNutritionValue(pendingDeleteTotals.protein)}g
                    </Text>
                  </View>
                  <View style={styles.deleteSummaryMetaPill}>
                    <Text style={styles.deleteSummaryMetaPillText}>
                      碳水 {formatNutritionValue(pendingDeleteTotals.carbs)}g
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {deleteErrorText ? <Text style={styles.deleteModalErrorText}>{deleteErrorText}</Text> : null}

            <View style={styles.deleteModalActionRow}>
              <Pressable
                style={[
                  styles.deleteModalSecondaryButton,
                  deletingMealId !== null && styles.deleteModalSecondaryButtonDisabled,
                ]}
                onPress={closeDeleteModal}
                disabled={deletingMealId !== null}
              >
                <Text style={styles.deleteModalSecondaryButtonText}>取消</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteModalDangerButton,
                  deletingMealId !== null && styles.deleteModalDangerButtonDisabled,
                ]}
                onPress={() => {
                  void confirmDeleteMeal();
                }}
                disabled={deletingMealId !== null}
              >
                <Text style={styles.deleteModalDangerButtonText}>
                  {deletingMealId !== null ? '删除中...' : '确认删除'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, isDark: boolean) {
  const glassSurface = isDark ? 'rgba(24, 22, 20, 0.92)' : 'rgba(255, 255, 255, 0.86)';
  const glassSurfaceStrong = isDark ? 'rgba(28, 25, 22, 0.94)' : 'rgba(255, 255, 255, 0.82)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)';
  const panelSurface = isDark ? palette.stone100 : palette.white;
  const panelSurfaceAlt = isDark ? palette.stone200 : palette.gold50;
  const panelBorder = isDark ? palette.stone200 : palette.stone100;
  const chipSurface = isDark ? palette.stone200 : palette.stone100;
  const activeSurface = isDark ? 'rgba(255, 140, 66, 0.14)' : palette.gold50;
  const activeSurfaceSoft = isDark ? 'rgba(255, 140, 66, 0.12)' : palette.cardTint;
  const badgeSurface = isDark ? 'rgba(255, 140, 66, 0.12)' : palette.gold50;
  const badgeBorder = isDark ? 'rgba(255, 140, 66, 0.18)' : palette.gold100;
  const primarySurface = isDark ? palette.orange500 : palette.stone900;
  const primaryText = isDark ? palette.surface : palette.gold50;
  const destructiveSurface = isDark ? 'rgba(239, 71, 111, 0.16)' : palette.imperial50;
  const destructiveBorder = isDark ? 'rgba(239, 71, 111, 0.24)' : palette.imperial100;
  const modalMask = isDark ? 'rgba(7, 6, 6, 0.56)' : 'rgba(30, 27, 24, 0.28)';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 140,
      gap: 18,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroCard: {
      backgroundColor: glassSurfaceStrong,
      borderRadius: 28,
      padding: 18,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      gap: 14,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.orange500,
    },
    heroTitle: {
      marginTop: 6,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      color: palette.stone900,
      maxWidth: 220,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      flexBasis: '47%',
      backgroundColor: panelSurface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
    },
    metricCardSubtle: {
      backgroundColor: panelSurfaceAlt,
      borderColor: badgeBorder,
    },
    metricLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone900,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.stone500,
    },
    projectionStrip: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isDark ? palette.stone200 : palette.stone900,
      gap: 4,
    },
    projectionLabel: {
      fontSize: 12,
      color: isDark ? palette.stone600 : palette.gold200,
    },
    projectionValue: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? palette.stone900 : palette.gold50,
      lineHeight: 20,
    },
    card: {
      backgroundColor: glassSurface,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.16 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      gap: 14,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    cardHint: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 19,
      color: palette.stone500,
    },
    aiEntryCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: isDark ? 'rgba(22, 24, 20, 0.78)' : palette.white,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 14,
    },
    aiEntryCopy: {
      gap: 6,
    },
    aiEntryEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.orange500,
    },
    aiEntryTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      color: palette.stone900,
    },
    aiEntryText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    aiEntryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: 18,
      backgroundColor: palette.orange500,
    },
    aiEntryButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#1A1714' : palette.white,
    },
    wizardShell: {
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(20, 18, 17, 0.58)' : 'rgba(255, 248, 241, 0.72)',
      borderWidth: 1,
      borderColor: panelBorder,
      padding: 12,
      gap: 12,
    },
    wizardHeader: {
      gap: 8,
    },
    wizardHeaderTopRow: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    wizardBackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    wizardBackButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    wizardBackPlaceholder: {
      width: 68,
    },
    wizardDraftButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    wizardDraftButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    wizardEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.orange500,
    },
    wizardTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      color: palette.stone900,
    },
    wizardSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    wizardProgressRow: {
      flexDirection: 'row',
      gap: 8,
    },
    wizardProgressDot: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      backgroundColor: isDark ? palette.stone300 : palette.stone200,
    },
    wizardProgressDotCompleted: {
      backgroundColor: palette.orange500,
      opacity: 0.45,
    },
    wizardProgressDotActive: {
      backgroundColor: palette.orange500,
      opacity: 1,
    },
    wizardContextRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    wizardContextPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    wizardContextPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    wizardStage: {
      minHeight: 0,
    },
    wizardPane: {
      gap: 12,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
      marginTop: 2,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionMoreButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    sectionMoreButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    sectionTipText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone500,
    },
    mealTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    mealTypeCard: {
      flexBasis: '47%',
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: panelSurface,
      gap: 8,
    },
    mealTypeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: panelSurfaceAlt,
    },
    mealTypeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone900,
    },
    mealTypeCaption: {
      fontSize: 12,
      color: palette.stone500,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
    },
    categoryChip: {
      flexBasis: '47%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
      minHeight: 86,
    },
    categoryChipActive: {
      backgroundColor: activeSurface,
      borderColor: palette.orange500,
    },
    categoryChipLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone900,
    },
    categoryChipLabelActive: {
      color: palette.stone900,
    },
    categoryChipHint: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    categoryChipHintActive: {
      color: palette.stone600,
    },
    foodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
    },
    foodCard: {
      flexBasis: '47%',
      borderRadius: 22,
      padding: 14,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 8,
      minHeight: 128,
    },
    foodCardActive: {
      borderColor: palette.orange500,
      backgroundColor: activeSurface,
    },
    foodIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foodIconWrapActive: {
      backgroundColor: palette.orange500,
    },
    foodName: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.stone900,
    },
    foodHint: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    foodMacro: {
      marginTop: 'auto',
      fontSize: 12,
      fontWeight: '600',
      color: palette.orange500,
    },
    selectionPreview: {
      backgroundColor: activeSurfaceSoft,
      borderRadius: 24,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    selectionPreviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    selectionPreviewTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    selectionPreviewHint: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    selectionPreviewBadge: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: panelSurface,
    },
    selectionPreviewBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.orange500,
    },
    weightRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
    },
    weightChip: {
      minWidth: 68,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      alignItems: 'center',
    },
    weightChipActive: {
      backgroundColor: activeSurface,
      borderColor: palette.orange500,
    },
    weightChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
    },
    weightChipTextActive: {
      color: palette.stone900,
    },
    inlineHintText: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone500,
    },
    secondaryButton: {
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      borderWidth: 1,
      borderColor: isDark ? palette.stone300 : palette.gold100,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.stone900,
    },
    reviewWrap: {
      gap: 12,
    },
    draftCard: {
      borderRadius: 24,
      padding: 16,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 14,
    },
    draftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    draftTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: palette.stone900,
    },
    draftHint: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    draftBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    draftBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    draftList: {
      gap: 10,
    },
    emptyDraftState: {
      gap: 12,
    },
    draftItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    draftItemMain: {
      flex: 1,
      gap: 4,
    },
    draftItemTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone900,
    },
    draftItemMeta: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    draftMacros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    macroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: chipSurface,
    },
    macroChipLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    macroChipValue: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone800,
    },
    primaryButton: {
      backgroundColor: primarySurface,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryButtonText: {
      fontSize: 15,
      color: primaryText,
      fontWeight: '800',
    },
    errorText: {
      fontSize: 13,
      color: palette.imperial500,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.stone500,
    },
    savedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    savedHeaderActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    historyEntryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    historyEntryButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    savedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    savedBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.blue500,
    },
    savedList: {
      gap: 12,
    },
    mealCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 12,
    },
    mealCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    mealCardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    mealCardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    mealCardTime: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    mealCardCalories: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
    },
    mealCardCaloriesText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    mealCardActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    mealCardDeleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255, 99, 132, 0.12)' : palette.rose100,
    },
    mealCardDeleteButtonDisabled: {
      opacity: 0.5,
    },
    mealCardDeleteText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.imperial500,
    },
    mealCardMacros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealItemWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealItemPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    mealItemPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.stone700,
    },
    foodPickerModalMask: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      backgroundColor: modalMask,
      zIndex: 80,
      elevation: 80,
    },
    foodPickerModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    foodPickerSheet: {
      maxHeight: '88%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 22,
      gap: 14,
    },
    foodPickerHandle: {
      alignSelf: 'center',
      width: 52,
      height: 5,
      borderRadius: 999,
      backgroundColor: palette.stone300,
      marginBottom: 4,
    },
    foodPickerHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    foodPickerHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    foodPickerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    foodPickerSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
    },
    foodPickerCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: panelSurfaceAlt,
    },
    foodPickerSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: panelSurfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    foodPickerSearchInput: {
      flex: 1,
      fontSize: 14,
      color: palette.stone800,
    },
    foodPickerContent: {
      gap: 14,
      paddingBottom: 8,
    },
    foodPickerList: {
      gap: 12,
    },
    foodPickerCategoryBlock: {
      gap: 10,
    },
    foodPickerCategoryCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: panelSurfaceAlt,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    foodPickerCategoryCardActive: {
      borderColor: palette.orange500,
      backgroundColor: activeSurface,
    },
    foodPickerCategoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    foodPickerCategoryText: {
      flex: 1,
      gap: 3,
    },
    foodPickerCategoryName: {
      fontSize: 14,
      fontWeight: '800',
      color: palette.stone900,
    },
    foodPickerCategoryNameActive: {
      color: palette.orange500,
    },
    foodPickerCategoryHint: {
      fontSize: 12,
      color: palette.stone500,
    },
    foodPickerCategoryCount: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.stone500,
    },
    foodPickerCategoryCountActive: {
      color: palette.orange500,
    },
    foodPickerFoodList: {
      gap: 10,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: palette.gold200,
    },
    foodPickerFoodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: panelSurfaceAlt,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    foodPickerFoodIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: badgeSurface,
    },
    foodPickerFoodMain: {
      flex: 1,
      gap: 4,
    },
    foodPickerFoodName: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    foodPickerFoodMeta: {
      fontSize: 13,
      color: palette.stone600,
    },
    foodPickerFoodHint: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    foodPickerHelper: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    deleteModalMask: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      paddingHorizontal: 22,
      backgroundColor: modalMask,
      zIndex: 90,
      elevation: 90,
    },
    deleteModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    deleteModalCard: {
      borderRadius: 28,
      padding: 20,
      gap: 16,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.24 : 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    deleteModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    deleteModalIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: destructiveSurface,
      borderWidth: 1,
      borderColor: destructiveBorder,
    },
    deleteModalTextWrap: {
      flex: 1,
      gap: 4,
    },
    deleteModalEyebrow: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.imperial500,
      letterSpacing: 0.3,
    },
    deleteModalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.stone900,
    },
    deleteModalMessage: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    deleteSummaryCard: {
      borderRadius: 20,
      padding: 14,
      gap: 12,
      backgroundColor: panelSurfaceAlt,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    deleteSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    deleteSummaryMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    deleteSummaryIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteSummaryTextWrap: {
      flex: 1,
    },
    deleteSummaryTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone900,
    },
    deleteSummarySubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    deleteSummaryCalories: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
    },
    deleteSummaryCaloriesText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    deleteSummaryMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    deleteSummaryMetaPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: chipSurface,
    },
    deleteSummaryMetaPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    deleteModalErrorText: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.imperial500,
    },
    deleteModalActionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteModalSecondaryButton: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: isDark ? palette.stone100 : palette.white,
    },
    deleteModalSecondaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.stone700,
    },
    deleteModalSecondaryButtonDisabled: {
      opacity: 0.5,
    },
    deleteModalDangerButton: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: palette.imperial500,
      shadowColor: palette.imperial500,
      shadowOpacity: isDark ? 0.2 : 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    deleteModalDangerButtonDisabled: {
      opacity: 0.72,
    },
    deleteModalDangerButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#1A1714' : palette.white,
    },
  });
}
