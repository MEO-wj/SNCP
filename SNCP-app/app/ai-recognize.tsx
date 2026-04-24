import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  AppleLogo,
  ArrowLeft,
  Camera,
  Coffee,
  Cookie,
  Drop,
  Egg,
  Fire,
  Fish,
  ForkKnife,
  Image as ImageIcon,
  Leaf,
  MagnifyingGlass,
  MoonStars,
  Plus,
  Sparkle,
  SunHorizon,
  Trash,
  UploadSimple,
  X,
} from 'phosphor-react-native';

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
import { usePalette } from '@/hooks/use-palette';
import { analyzeNutrition, recognizeFoods } from '@/services/ai';
import { createMeal } from '@/services/meals';
import { primeNutritionExperience } from '@/services/nutrition-prime';
import { notifyNutritionRefresh } from '@/services/nutrition-refresh';
import type { AiNutritionResult, AiRecognitionResult, AiRecognizedItem } from '@/types/ai';
import { formatNutritionValue, scaleNutrition, sumNutritionValues } from '@/utils/nutrition';

const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
] as const;

type IconComponent = React.ComponentType<any>;

const MEAL_META: Record<
  (typeof MEAL_TYPES)[number]['value'],
  {
    label: string;
    caption: string;
    icon: IconComponent;
    tint: string;
    surfaceTint: string;
  }
> = {
  breakfast: {
    label: '早餐',
    caption: '晨间补能',
    icon: SunHorizon,
    tint: '#E38B2F',
    surfaceTint: 'rgba(255, 209, 102, 0.20)',
  },
  lunch: {
    label: '午餐',
    caption: '主力进食',
    icon: ForkKnife,
    tint: '#D76A4A',
    surfaceTint: 'rgba(243, 106, 139, 0.12)',
  },
  dinner: {
    label: '晚餐',
    caption: '轻盈收口',
    icon: MoonStars,
    tint: '#7A66D9',
    surfaceTint: 'rgba(106, 142, 174, 0.16)',
  },
  snack: {
    label: '加餐',
    caption: '两餐之间',
    icon: Coffee,
    tint: '#4E8C63',
    surfaceTint: 'rgba(76, 175, 80, 0.16)',
  },
};

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = FOOD_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<FoodCategory, string>,
);

type PickedImage = { uri: string; base64?: string | null };
type EditableRecognitionItem = AiRecognizedItem & { local_id: string };
type FoodPickerTarget = string | 'new' | null;

const EMPTY_TOTALS = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, sugar: 0 };

function nextLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKeyword(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').trim();
}

function buildEditableItems(items: AiRecognitionResult['items']): EditableRecognitionItem[] {
  return items.map((item, index) => ({
    ...item,
    local_id: `${item.canonical_name || item.food_name || item.name || 'food'}-${index}-${Date.now()}`,
  }));
}

function resolveFoodByCanonicalName(value?: string | null) {
  return FOOD_CATALOG.find((item) => item.id === value) ?? null;
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
    default:
      return <Sparkle size={size} color={color} weight="duotone" />;
  }
}

function createEditableRecognitionItem(food: FoodCatalogItem, overrides?: Partial<EditableRecognitionItem>): EditableRecognitionItem {
  return {
    local_id: overrides?.local_id || nextLocalId(food.id),
    canonical_name: food.id,
    name: food.name,
    food_name: food.name,
    display_name: food.name,
    category: food.category,
    food_category: FOOD_CATEGORY_LABELS[food.category],
    confidence: overrides?.confidence ?? null,
    weight_g: overrides?.weight_g ?? food.defaultWeightG,
    source: overrides?.source ?? 'manual',
    nutrition: food.nutritionPer100g,
    matched: true,
    notes: overrides?.notes ?? null,
  };
}

export default function AIRecognizeScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const recognizeLockRef = useRef(false);

  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]['value']>('lunch');
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [hintText, setHintText] = useState('');
  const [recognition, setRecognition] = useState<AiRecognitionResult | null>(null);
  const [editableItems, setEditableItems] = useState<EditableRecognitionItem[]>([]);
  const [analysis, setAnalysis] = useState<AiNutritionResult | null>(null);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  const [busyMode, setBusyMode] = useState<'library' | 'camera' | 'recognize' | 'save' | 'analysis' | null>(null);
  const [errorText, setErrorText] = useState('');
  const [foodPickerVisible, setFoodPickerVisible] = useState(false);
  const [foodPickerTarget, setFoodPickerTarget] = useState<FoodPickerTarget>(null);
  const [foodPickerCategory, setFoodPickerCategory] = useState<FoodCategory | ''>('staple');
  const [foodPickerKeyword, setFoodPickerKeyword] = useState('');
  const [weightPickerVisible, setWeightPickerVisible] = useState(false);
  const [weightPickerTargetId, setWeightPickerTargetId] = useState<string | null>(null);
  const [customWeightText, setCustomWeightText] = useState('');

  const recognitionTotals = useMemo(
    () =>
      editableItems.length
        ? editableItems.reduce(
            (acc, item) => sumNutritionValues(acc, scaleNutrition(item.nutrition, item.weight_g)),
            EMPTY_TOTALS,
          )
        : null,
    [editableItems],
  );
  const providerLabel = useMemo(() => {
    switch (recognition?.provider) {
      case 'zhipu':
        return '智谱视觉识别';
      case 'openai':
        return 'OpenAI 视觉识别';
      case 'remote':
        return '外部识别服务';
      case 'local':
        return '本地提示词匹配';
      default:
        return 'AI 识别';
    }
  }, [recognition?.provider]);
  const foodsByCategory = useMemo(() => {
    const keyword = normalizeKeyword(foodPickerKeyword);
    return FOOD_CATEGORIES.map((category) => ({
      ...category,
      foods: FOOD_CATALOG.filter((item) => item.category === category.value).filter((item) => {
        return !keyword || normalizeKeyword(`${item.name}${item.portionHint}${item.id}`).includes(keyword);
      }),
    })).filter((category) => !keyword || category.foods.length > 0);
  }, [foodPickerKeyword]);
  const weightPickerTargetItem = useMemo(
    () => editableItems.find((item) => item.local_id === weightPickerTargetId) ?? null,
    [editableItems, weightPickerTargetId],
  );

  function resetRecognitionState() {
    setRecognition(null);
    setEditableItems([]);
    setAnalysis(null);
    setAnalysisDirty(false);
    setFoodPickerVisible(false);
    setWeightPickerVisible(false);
    setFoodPickerTarget(null);
    setWeightPickerTargetId(null);
  }

  function markAsEdited(updater: (prev: EditableRecognitionItem[]) => EditableRecognitionItem[]) {
    setEditableItems((prev) => updater(prev));
    setAnalysisDirty(true);
  }

  async function refreshNutritionAnalysis(items: EditableRecognitionItem[]) {
    if (!token || items.length === 0) {
      setAnalysis(null);
      setAnalysisDirty(false);
      return;
    }
    const nutritionResult = await analyzeNutrition(
      token,
      items.map((item) => ({
        food_name: item.food_name || item.name,
        food_category: item.food_category,
        weight_g: item.weight_g,
        source: item.source || 'ai',
        nutrition: item.nutrition || {},
      })),
    );
    setAnalysis(nutritionResult);
    setAnalysisDirty(false);
  }

  async function pickFromLibrary() {
    setErrorText('');
    setBusyMode('library');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorText('没有相册权限，无法读取图片。');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        setPickedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
        resetRecognitionState();
      }
    } catch (error) {
      console.error('[AI] pick image failed', error);
      setErrorText('读取图片失败，请稍后重试。');
    } finally {
      setBusyMode(null);
    }
  }

  async function pickFromCamera() {
    setErrorText('');
    setBusyMode('camera');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorText('没有相机权限，无法拍照识别。');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: false, cameraType: ImagePicker.CameraType.back });
      if (!result.canceled && result.assets[0]) {
        setPickedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
        resetRecognitionState();
      }
    } catch (error) {
      console.error('[AI] camera failed', error);
      setErrorText('拍照失败，请稍后重试。');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleRecognize() {
    if (recognizeLockRef.current || busyMode !== null) {
      return;
    }
    if (!token) {
      setErrorText('当前未登录，无法调用识别接口。');
      return;
    }
    if (!pickedImage?.base64 && !hintText.trim()) {
      setErrorText('请先选择图片，或者至少输入提示词。');
      return;
    }
    recognizeLockRef.current = true;
    setBusyMode('recognize');
    setErrorText('');
    closeFoodPicker();
    closeWeightPicker();
    try {
      const result = await recognizeFoods(token, { image_base64: pickedImage?.base64 || undefined, hint_text: hintText.trim() || undefined });
      const nextItems = buildEditableItems(result.items);
      setRecognition(result);
      setEditableItems(nextItems);
      if (nextItems.length > 0) {
        await refreshNutritionAnalysis(nextItems);
      } else {
        setAnalysis(null);
        setAnalysisDirty(false);
      }
    } catch (error) {
      console.error('[AI] recognize failed', error);
      resetRecognitionState();
      setErrorText(error instanceof Error ? error.message : '识别失败，请稍后重试。');
    } finally {
      recognizeLockRef.current = false;
      setBusyMode(null);
    }
  }

  function openFoodPicker(target: FoodPickerTarget, preferredCategory?: FoodCategory) {
    setFoodPickerTarget(target);
    setFoodPickerCategory(preferredCategory ?? 'staple');
    setFoodPickerKeyword('');
    setFoodPickerVisible(true);
  }

  function closeFoodPicker() {
    setFoodPickerVisible(false);
    setFoodPickerTarget(null);
    setFoodPickerKeyword('');
  }

  function handleSelectFood(food: FoodCatalogItem) {
    if (foodPickerTarget === 'new') {
      markAsEdited((prev) => [...prev, createEditableRecognitionItem(food)]);
    } else if (foodPickerTarget) {
      markAsEdited((prev) =>
        prev.map((item) =>
          item.local_id === foodPickerTarget
            ? createEditableRecognitionItem(food, {
                local_id: item.local_id,
                confidence: item.confidence,
                source: item.source || 'ai-edited',
                weight_g: item.weight_g || food.defaultWeightG,
                notes: item.notes,
              })
            : item,
        ),
      );
    }
    closeFoodPicker();
  }

  function openWeightPicker(localId: string) {
    const item = editableItems.find((entry) => entry.local_id === localId);
    setWeightPickerTargetId(localId);
    setCustomWeightText(item?.weight_g ? String(Math.round(item.weight_g)) : '');
    setWeightPickerVisible(true);
  }

  function closeWeightPicker() {
    setWeightPickerVisible(false);
    setWeightPickerTargetId(null);
    setCustomWeightText('');
  }

  function applyWeight(weight: number) {
    if (!weightPickerTargetId || !Number.isFinite(weight) || weight <= 0) {
      return;
    }
    markAsEdited((prev) =>
      prev.map((item) => (item.local_id === weightPickerTargetId ? { ...item, weight_g: weight } : item)),
    );
    closeWeightPicker();
  }

  function handleApplyCustomWeight() {
    const numeric = Number(customWeightText.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setErrorText('请输入有效的克重。');
      return;
    }
    setErrorText('');
    applyWeight(numeric);
  }

  async function handleRefreshAnalysis() {
    if (busyMode !== null || !editableItems.length) {
      return;
    }
    setBusyMode('analysis');
    setErrorText('');
    try {
      await refreshNutritionAnalysis(editableItems);
    } catch (error) {
      console.error('[AI] refresh analysis failed', error);
      setErrorText(error instanceof Error ? error.message : '更新营养分析失败。');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleSaveMeal() {
    if (!token) {
      setErrorText('当前未登录，无法保存餐次。');
      return;
    }
    if (!editableItems.length) {
      setErrorText('当前没有可保存的识别食物项。');
      return;
    }
    setBusyMode('save');
    setErrorText('');
    try {
      await createMeal(
        {
          meal_type: mealType,
          eaten_at: new Date().toISOString(),
          client_request_id: `ai-${Date.now().toString(36)}`,
          note: recognition?.scene_summary ? `AI识别: ${recognition.scene_summary}` : 'AI识别导入',
          items: editableItems.map((item) => ({
            food_name: item.display_name || item.food_name || item.name,
            food_category: item.food_category,
            weight_g: item.weight_g,
            source: item.source || 'ai',
            nutrition: item.nutrition || {},
          })),
        },
        token,
      );
      notifyNutritionRefresh('meals');
      void primeNutritionExperience(token);
      router.replace('/(tabs)/record');
    } catch (error) {
      console.error('[AI] save meal failed', error);
      setErrorText(error instanceof Error ? error.message : '保存识别结果失败。');
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color={palette.stone800} weight="bold" />
            <Text style={styles.backButtonText}>返回</Text>
          </Pressable>
          <View style={styles.providerPill}>
            <Sparkle size={14} color={palette.orange500} weight="fill" />
            <Text style={styles.providerPillText}>AI 识别记餐</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>先识别，再用选择器修正</Text>
          <Text style={styles.heroText}>这页支持选择食物、选择克重、补加漏识别项，也更适合补酱料和烹调油。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>餐次归类</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((option) => {
              const active = mealType === option.value;
              const meta = MEAL_META[option.value];
              const Icon = meta.icon;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.mealTypeCard,
                    active && {
                      borderColor: meta.tint,
                      backgroundColor: meta.surfaceTint,
                    },
                  ]}
                  onPress={() => setMealType(option.value)}
                >
                  <View style={[styles.mealTypeIconWrap, active && { backgroundColor: meta.tint }]}>
                    <Icon size={18} color={active ? palette.white : meta.tint} weight="fill" />
                  </View>
                  <Text style={styles.mealTypeTitle}>{meta.label}</Text>
                  <Text style={styles.mealTypeCaption}>{meta.caption}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>图片输入</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={pickFromLibrary} disabled={busyMode !== null}>
              <ImageIcon size={18} color={palette.orange500} weight="duotone" />
              <Text style={styles.actionText}>{busyMode === 'library' ? '读取中...' : '从相册选择'}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={pickFromCamera} disabled={busyMode !== null}>
              <Camera size={18} color={palette.orange500} weight="duotone" />
              <Text style={styles.actionText}>{busyMode === 'camera' ? '打开中...' : '拍照识别'}</Text>
            </Pressable>
          </View>
          <View style={styles.previewCard}>
            {pickedImage?.uri ? (
              <ExpoImage source={{ uri: pickedImage.uri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.previewPlaceholder}>
                <UploadSimple size={26} color={palette.stone400} weight="duotone" />
                <Text style={styles.previewHint}>还没有选择图片</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>提示词</Text>
          <TextInput
            style={styles.hintInput}
            value={hintText}
            onChangeText={setHintText}
            placeholder={
              Platform.OS === 'web'
                ? '例如：沙茶酱牛肉、上海青、盘底有酱汁。视觉模型不稳定时，也能辅助匹配。'
                : '例如：沙茶酱牛肉、上海青、盘底有酱汁'
            }
            placeholderTextColor={palette.stone400}
            multiline
          />
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleRecognize} disabled={busyMode !== null}>
            {busyMode === 'recognize' ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryButtonText}>开始识别</Text>}
          </Pressable>
        </View>

        {recognition ? (
          <View style={styles.card}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <Text style={styles.cardTitle}>识别结果</Text>
                <View style={styles.smallPill}>
                  <Text style={styles.smallPillText}>{providerLabel}</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.88} style={styles.addButton} onPress={() => openFoodPicker('new', 'protein')}>
                <Plus size={16} color={palette.orange500} weight="bold" />
                <Text style={styles.addButtonText}>新增</Text>
              </TouchableOpacity>
            </View>
            {recognition.scene_summary ? <Text style={styles.helper}>场景概述：{recognition.scene_summary}</Text> : null}

            {!editableItems.length ? (
              <View style={styles.softCard}>
                <Text style={styles.helper}>这次没有识别出可用食物项，你可以先手动补一项。</Text>
                <TouchableOpacity activeOpacity={0.88} style={styles.secondaryButton} onPress={() => openFoodPicker('new', 'protein')}>
                  <Text style={styles.secondaryButtonText}>手动新增食物</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.list}>
                {editableItems.map((item) => {
                  const food = resolveFoodByCanonicalName(item.canonical_name);
                  const displayName = item.display_name || item.food_name || item.name;
                  const calories = Math.round(scaleNutrition(item.nutrition, item.weight_g).calories);
                  return (
                    <View key={item.local_id} style={styles.itemCard}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTitle}>食物</Text>
                        <Text style={styles.kcalText}>{calories} kcal</Text>
                      </View>
                      <TouchableOpacity activeOpacity={0.88} style={styles.selector} onPress={() => openFoodPicker(item.local_id, food?.category ?? 'protein')}>
                        <View style={styles.iconWrap}>{renderFoodIcon(food?.icon ?? 'drop', palette.orange500, 18)}</View>
                        <View style={styles.selectorMain}>
                          <Text style={styles.selectorName}>{displayName}</Text>
                          <Text style={styles.selectorMeta}>
                            {(food ? FOOD_CATEGORY_LABELS[food.category] : item.food_category) || '未分类'}
                            {item.confidence ? ` · 置信度 ${Math.round(item.confidence * 100)}%` : ''}
                          </Text>
                        </View>
                        <Text style={styles.selectorAction}>更换</Text>
                      </TouchableOpacity>
                      <View style={styles.itemActions}>
                        <TouchableOpacity activeOpacity={0.88} style={styles.weightButton} onPress={() => openWeightPicker(item.local_id)}>
                          <Text style={styles.weightLabel}>重量</Text>
                          <Text style={styles.weightValue}>{Math.round(item.weight_g || 0)}g</Text>
                          <Text style={styles.weightHint}>点按选择</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.88} style={styles.deleteButton} onPress={() => markAsEdited((prev) => prev.filter((entry) => entry.local_id !== item.local_id))}>
                          <Trash size={16} color={palette.imperial500} weight="bold" />
                          <Text style={styles.deleteText}>删除</Text>
                        </TouchableOpacity>
                      </View>
                      {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}

            {recognitionTotals ? (
              <View style={styles.softCard}>
                <Text style={styles.softTitle}>识别餐次估算</Text>
                <Text style={styles.softValue}>
                  {Math.round(recognitionTotals.calories)} kcal · 蛋白 {formatNutritionValue(recognitionTotals.protein)}g ·
                  脂肪 {formatNutritionValue(recognitionTotals.fat)}g · 碳水 {formatNutritionValue(recognitionTotals.carbs)}g
                </Text>
              </View>
            ) : null}

            {analysisDirty ? (
              <View style={styles.softCard}>
                <Text style={styles.helper}>你已经修改了识别结果，建议先更新分析再保存。</Text>
                <TouchableOpacity activeOpacity={0.88} style={styles.secondaryButton} onPress={handleRefreshAnalysis} disabled={busyMode !== null}>
                  {busyMode === 'analysis' ? <ActivityIndicator color={palette.orange500} /> : <Text style={styles.secondaryButtonText}>更新分析</Text>}
                </TouchableOpacity>
              </View>
            ) : null}

            {analysis?.ai?.analysis && !analysisDirty ? (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>营养分析</Text>
                <Text style={styles.analysisLine}>{analysis.ai.analysis.summary}</Text>
                {analysis.ai.analysis.strengths.map((item) => <Text key={`s-${item}`} style={styles.analysisLine}>优点：{item}</Text>)}
                {analysis.ai.analysis.risks.map((item) => <Text key={`r-${item}`} style={styles.analysisLine}>风险：{item}</Text>)}
                {analysis.ai.analysis.next_actions.map((item) => <Text key={`n-${item}`} style={styles.analysisLine}>建议：{item}</Text>)}
              </View>
            ) : null}

            <Pressable style={[styles.primaryButton, !editableItems.length && styles.disabled]} onPress={handleSaveMeal} disabled={busyMode !== null || !editableItems.length}>
              {busyMode === 'save' ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryButtonText}>保存为餐次</Text>}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {foodPickerVisible ? (
        <View style={styles.overlayWrap} pointerEvents="box-none">
          <Pressable style={styles.modalMask} onPress={closeFoodPicker} />
          <View style={styles.modalSheetWrap}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>{foodPickerTarget === 'new' ? '新增食物' : '更换食物'}</Text>
                  <Text style={styles.modalSubtitle}>从食物目录里选一个更准确的条目。</Text>
                </View>
                <Pressable style={styles.closeButton} onPress={closeFoodPicker}>
                  <X size={16} color={palette.stone700} weight="bold" />
                </Pressable>
              </View>
              <View style={styles.searchBox}>
                <MagnifyingGlass size={16} color={palette.stone500} weight="bold" />
                <TextInput style={styles.searchInput} value={foodPickerKeyword} onChangeText={setFoodPickerKeyword} placeholder="搜索食物" placeholderTextColor={palette.stone400} />
              </View>
              <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.list}>
                  {foodsByCategory.length === 0 ? <Text style={styles.helper}>没有匹配结果，换个关键词试试。</Text> : null}
                  {foodsByCategory.map((category) => {
                    const active = foodPickerCategory === category.value;
                    return (
                      <View key={category.value} style={styles.categoryBlock}>
                        <TouchableOpacity activeOpacity={0.88} style={[styles.categoryCard, active && styles.categoryCardActive]} onPress={() => setFoodPickerCategory(active ? '' : category.value)}>
                          <View style={styles.categoryCardHeader}>
                            <View style={styles.categoryCardText}>
                              <Text style={[styles.categoryName, active && styles.categoryNameActive]}>{category.label}</Text>
                              <Text style={styles.categoryHint}>{category.hint}</Text>
                            </View>
                            <Text style={[styles.categoryCount, active && styles.categoryCountActive]}>{category.foods.length} 项</Text>
                          </View>
                        </TouchableOpacity>
                        {active ? (
                          <View style={styles.categoryFoodList}>
                            {category.foods.length === 0 ? (
                              <Text style={styles.helper}>该分类下没有匹配结果，可以换个分类或关键词。</Text>
                            ) : (
                              category.foods.map((food) => (
                                <TouchableOpacity key={food.id} activeOpacity={0.88} style={styles.foodRow} onPress={() => handleSelectFood(food)}>
                                  <View style={styles.iconWrap}>{renderFoodIcon(food.icon, palette.orange500, 18)}</View>
                                  <View style={styles.selectorMain}>
                                    <Text style={styles.selectorName}>{food.name}</Text>
                                    <Text style={styles.selectorMeta}>{FOOD_CATEGORY_LABELS[food.category]} · 默认 {food.defaultWeightG}g</Text>
                                    <Text style={styles.note}>{food.portionHint}</Text>
                                  </View>
                                </TouchableOpacity>
                              ))
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </View>
        </View>
      ) : null}

      {weightPickerVisible ? (
        <View style={styles.overlayWrap} pointerEvents="box-none">
          <Pressable style={styles.modalMask} onPress={closeWeightPicker} />
          <View style={styles.modalSheetWrap}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>调整重量</Text>
                  <Text style={styles.modalSubtitle}>优先选常用克重，也可以输入自定义数值。</Text>
                </View>
                <Pressable style={styles.closeButton} onPress={closeWeightPicker}>
                  <X size={16} color={palette.stone700} weight="bold" />
                </Pressable>
              </View>
              <Text style={styles.helper}>{weightPickerTargetItem?.display_name || weightPickerTargetItem?.food_name || '当前食物'}</Text>
              <View style={styles.chipRow}>
                {FOOD_WEIGHT_OPTIONS.map((weight) => {
                  const active = Math.round(weightPickerTargetItem?.weight_g || 0) === weight;
                  return (
                    <TouchableOpacity key={weight} activeOpacity={0.88} style={[styles.chip, active && styles.chipActive]} onPress={() => applyWeight(weight)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{weight}g</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.customWeight}>
                <TextInput style={styles.customWeightInput} value={customWeightText} onChangeText={setCustomWeightText} keyboardType="numeric" placeholder="自定义克重，例如 135" placeholderTextColor={palette.stone400} />
                <Pressable style={styles.secondaryButton} onPress={handleApplyCustomWeight}>
                  <Text style={styles.secondaryButtonText}>应用</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <BottomDock
        activeTab="record"
        onHome={() => router.navigate('/(tabs)')}
        onRecord={() => router.navigate('/(tabs)/record')}
        onRecommend={() => router.navigate('/(tabs)/recommend')}
        onTrend={() => router.navigate('/(tabs)/trend')}
        onProfile={() => router.navigate('/(tabs)/settings')}
      />
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.surface },
    content: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 140, gap: 16 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.white,
    },
    backButtonText: { fontSize: 13, fontWeight: '700', color: palette.stone800 },
    providerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    providerPillText: { fontSize: 12, fontWeight: '700', color: palette.orange500 },
    heroCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 8,
    },
    heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: palette.stone900 },
    heroText: { fontSize: 14, lineHeight: 22, color: palette.stone600 },
    card: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 12,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: palette.stone900 },
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
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      gap: 8,
    },
    mealTypeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.white,
    },
    mealTypeTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    mealTypeCaption: {
      fontSize: 12,
      color: palette.stone500,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
    },
    chipActive: { backgroundColor: palette.gold50, borderColor: palette.orange500 },
    chipText: { fontSize: 13, fontWeight: '700', color: palette.stone700 },
    chipTextActive: { color: palette.orange500 },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexBasis: '48%',
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
    },
    actionText: { fontSize: 14, fontWeight: '700', color: palette.stone900 },
    previewCard: {
      borderRadius: 20,
      overflow: 'hidden',
      minHeight: 220,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    previewImage: { width: '100%', height: 240 },
    previewPlaceholder: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
    previewHint: { fontSize: 14, color: palette.stone500 },
    label: { fontSize: 13, fontWeight: '700', color: palette.stone700 },
    hintInput: {
      minHeight: 92,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.gold200,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone800,
      textAlignVertical: 'top',
      shadowColor: palette.gold300,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1,
    },
    helper: { fontSize: 13, lineHeight: 20, color: palette.stone600 },
    error: { fontSize: 13, lineHeight: 18, color: palette.imperial500 },
    primaryButton: {
      minHeight: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.stone900,
    },
    primaryButtonText: { fontSize: 15, fontWeight: '800', color: palette.gold50 },
    secondaryButton: {
      minHeight: 44,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      paddingHorizontal: 14,
    },
    secondaryButtonText: { fontSize: 14, fontWeight: '700', color: palette.orange500 },
    resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    smallPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.surfaceWarm },
    smallPillText: { fontSize: 12, fontWeight: '700', color: palette.stone700 },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    addButtonText: { fontSize: 13, fontWeight: '700', color: palette.orange500 },
    softCard: {
      gap: 10,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
    },
    softTitle: { fontSize: 13, fontWeight: '700', color: palette.orange500 },
    softValue: { fontSize: 14, lineHeight: 22, color: palette.stone800 },
    list: { gap: 10 },
    itemCard: {
      gap: 10,
      padding: 14,
      borderRadius: 20,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemTitle: { fontSize: 12, fontWeight: '700', color: palette.stone500 },
    kcalText: { fontSize: 14, fontWeight: '800', color: palette.orange500 },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold50 },
    selectorMain: { flex: 1, gap: 4 },
    selectorName: { fontSize: 16, fontWeight: '800', color: palette.stone900 },
    selectorMeta: { fontSize: 13, color: palette.stone600 },
    selectorAction: { fontSize: 13, fontWeight: '700', color: palette.orange500 },
    itemActions: { flexDirection: 'row', gap: 10 },
    weightButton: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 2,
    },
    weightLabel: { fontSize: 12, fontWeight: '700', color: palette.stone500 },
    weightValue: { fontSize: 18, fontWeight: '800', color: palette.stone900 },
    weightHint: { fontSize: 12, color: palette.stone500 },
    deleteButton: {
      minWidth: 92,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: palette.rose100,
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    deleteText: { fontSize: 12, fontWeight: '700', color: palette.imperial500 },
    note: { fontSize: 12, lineHeight: 18, color: palette.stone500 },
    analysisCard: {
      gap: 6,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.white,
    },
    analysisTitle: { fontSize: 15, fontWeight: '800', color: palette.stone900 },
    analysisLine: { fontSize: 13, lineHeight: 20, color: palette.stone600 },
    disabled: { opacity: 0.55 },
    overlayWrap: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
      elevation: 40,
      justifyContent: 'flex-end',
    },
    modalMask: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(18, 17, 16, 0.42)',
    },
    modalSheetWrap: {
      justifyContent: 'flex-end',
    },
    modalSheet: {
      maxHeight: '88%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 22,
      gap: 14,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 52,
      height: 5,
      borderRadius: 999,
      backgroundColor: palette.stone300,
      marginBottom: 4,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    modalHeaderCopy: { flex: 1, gap: 4 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: palette.stone900 },
    modalSubtitle: { fontSize: 13, lineHeight: 20, color: palette.stone600 },
    closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceWarm },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 14, color: palette.stone800 },
    modalContent: { gap: 14, paddingBottom: 8 },
    categoryBlock: { gap: 10 },
    categoryCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 3,
    },
    categoryCardActive: { borderColor: palette.orange500, backgroundColor: palette.gold50 },
    categoryCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    categoryCardText: { flex: 1, gap: 3 },
    categoryCount: { fontSize: 12, fontWeight: '800', color: palette.stone500 },
    categoryCountActive: { color: palette.orange500 },
    categoryName: { fontSize: 14, fontWeight: '800', color: palette.stone900 },
    categoryNameActive: { color: palette.orange500 },
    categoryHint: { fontSize: 12, color: palette.stone500 },
    categoryFoodList: {
      gap: 10,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: palette.gold200,
    },
    foodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    customWeight: { gap: 10 },
    customWeightInput: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.white,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.stone900,
    },
  });
}
