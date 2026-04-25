import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Camera, Plus, Trash } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { PageHeader } from '@/components/page-header';
import { RecipeCoverPlaceholder } from '@/components/recipe-cover-placeholder';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { extractRecipeDraft } from '@/services/ai';
import { DEMO_RECIPE_POSTS, getRecipeCover, mapLibraryRecipesToPosts } from '@/services/recipe-posts';
import { createRecipe, deleteRecipe, fetchRecipes, updateRecipe } from '@/services/recipes';
import type { AiRecipeDraft } from '@/types/ai';
import type { Recipe } from '@/types/recipe';

type FormIngredient = {
  name: string;
  amount: string;
};

type FormTextItem = {
  value: string;
};

type FormState = {
  name: string;
  cuisine: string;
  tags: FormTextItem[];
  suitableFor: FormTextItem[];
  summary: string;
  sourceUrl: string;
  sourceProvider: string;
  coverUrl: string;
  coverPreviewUrl: string;
  ingredients: FormIngredient[];
  steps: string[];
};

const EMPTY_INGREDIENT: FormIngredient = { name: '', amount: '' };
const EMPTY_TEXT_ITEM: FormTextItem = { value: '' };

const EMPTY_FORM: FormState = {
  name: '',
  cuisine: '家常',
  tags: [{ ...EMPTY_TEXT_ITEM }],
  suitableFor: [{ ...EMPTY_TEXT_ITEM }],
  summary: '',
  sourceUrl: '',
  sourceProvider: '',
  coverUrl: '',
  coverPreviewUrl: '',
  ingredients: [{ ...EMPTY_INGREDIENT }],
  steps: [''],
};

function normalizeTextItems(items: FormTextItem[]) {
  return items.map((item) => item.value.trim()).filter(Boolean);
}

function buildFormFromRecipe(recipe?: Recipe | null): FormState {
  if (!recipe) {
    return EMPTY_FORM;
  }

  const mappedRecipePost = mapLibraryRecipesToPosts([recipe])[0];
  const resolvedCoverUrl = mappedRecipePost?.coverUrl || '';

  const ingredients =
    (recipe.ingredients || []).length > 0
      ? (recipe.ingredients || []).map((item) => ({
          name: item?.name || '',
          amount: item?.amount || '',
        }))
      : [{ ...EMPTY_INGREDIENT }];

  const steps = (recipe.steps || []).length > 0 ? (recipe.steps || []).map((step) => step || '') : [''];

  return {
    name: recipe.name || '',
    cuisine: recipe.cuisine || '家常',
    tags:
      (recipe.tags || []).length > 0
        ? (recipe.tags || []).map((item) => ({ value: item || '' }))
        : [{ ...EMPTY_TEXT_ITEM }],
    suitableFor:
      (recipe.suitable_for || []).length > 0
        ? (recipe.suitable_for || []).map((item) => ({ value: item || '' }))
        : [{ ...EMPTY_TEXT_ITEM }],
    summary: '',
    sourceUrl: recipe.source_url || '',
    sourceProvider: recipe.source_provider || '',
    coverUrl: resolvedCoverUrl,
    coverPreviewUrl: resolvedCoverUrl,
    ingredients,
    steps,
  };
}

function buildFormFromDraft(
  draft: AiRecipeDraft,
  cover: { coverUrl: string; coverPreviewUrl: string },
): FormState {
  const ingredients =
    (draft.ingredients || []).filter((item) => item?.name?.trim()).map((item) => ({
      name: item.name?.trim() || '',
      amount: item.amount?.trim() || '',
    })) || [];

  const steps = (draft.steps || []).map((item) => item?.trim() || '').filter(Boolean);
  const tags = (draft.tags || []).map((item) => ({ value: item?.trim() || '' })).filter((item) => item.value);
  const suitableFor = (draft.suitable_for || [])
    .map((item) => ({ value: item?.trim() || '' }))
    .filter((item) => item.value);

  return {
    name: draft.name?.trim() || '',
    cuisine: draft.cuisine?.trim() || '家常',
    tags: tags.length > 0 ? tags : [{ ...EMPTY_TEXT_ITEM }],
    suitableFor: suitableFor.length > 0 ? suitableFor : [{ ...EMPTY_TEXT_ITEM }],
    summary: draft.summary?.trim() || '',
    sourceUrl: '',
    sourceProvider: draft.source_provider?.trim() || 'AI识图生成',
    coverUrl: cover.coverUrl,
    coverPreviewUrl: cover.coverPreviewUrl,
    ingredients: ingredients.length > 0 ? ingredients : [{ ...EMPTY_INGREDIENT }],
    steps: steps.length > 0 ? steps : [''],
  };
}

function buildSummaryPreview(form: FormState) {
  const summary = form.summary.trim();
  if (summary) {
    return summary;
  }
  const firstStep = form.steps.map((item) => item.trim()).find(Boolean);
  if (firstStep) {
    return firstStep;
  }
  const tags = normalizeTextItems(form.tags);
  if (tags.length > 0) {
    return `适合${tags.slice(0, 2).join('、')}场景的日常食谱。`;
  }
  return '补充完整食材与步骤后，这里会展示食谱简介。';
}

export default function AdminRecipesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [hintText, setHintText] = useState('');

  const managedRecipes = useMemo(
    () => recipes.filter((item) => Number.isFinite(Number(item.id))),
    [recipes],
  );
  const previewSummary = useMemo(() => buildSummaryPreview(form), [form]);
  const previewCoverSource = useMemo(() => {
    if (form.coverPreviewUrl.trim()) {
      return { uri: form.coverPreviewUrl };
    }
    return getRecipeCover({ coverUrl: form.coverUrl });
  }, [form.coverPreviewUrl, form.coverUrl]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchRecipes(token, undefined, undefined, 'server');
      setRecipes(res.recipes || []);
    } catch (error) {
      console.error('[AdminRecipes] load failed', error);
      setHintText(error instanceof Error ? error.message : '加载服务器食谱失败。');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChange = useCallback((key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const updateTextItem = useCallback(
    (field: 'tags' | 'suitableFor', index: number, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: current[field].map((item, itemIndex) =>
          itemIndex === index ? { value } : item,
        ),
      }));
    },
    [],
  );

  const addTextItem = useCallback((field: 'tags' | 'suitableFor') => {
    setForm((current) => ({
      ...current,
      [field]: [...current[field], { ...EMPTY_TEXT_ITEM }],
    }));
  }, []);

  const removeTextItem = useCallback((field: 'tags' | 'suitableFor', index: number) => {
    setForm((current) => {
      const nextItems = current[field].filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        [field]: nextItems.length > 0 ? nextItems : [{ ...EMPTY_TEXT_ITEM }],
      };
    });
  }, []);

  const updateIngredient = useCallback((index: number, key: keyof FormIngredient, value: string) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }, []);

  const addIngredient = useCallback(() => {
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ...EMPTY_INGREDIENT }],
    }));
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setForm((current) => {
      const nextIngredients = current.ingredients.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        ingredients: nextIngredients.length > 0 ? nextIngredients : [{ ...EMPTY_INGREDIENT }],
      };
    });
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }, []);

  const addStep = useCallback(() => {
    setForm((current) => ({
      ...current,
      steps: [...current.steps, ''],
    }));
  }, []);

  const removeStep = useCallback((index: number) => {
    setForm((current) => {
      const nextSteps = current.steps.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        steps: nextSteps.length > 0 ? nextSteps : [''],
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setEditingRecipeId(null);
    setForm(EMPTY_FORM);
    setHintText('');
  }, []);

  const handlePickCover = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setHintText('需要相册权限才能选择食谱图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.base64) {
      setHintText('读取图片失败，请重新选择');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const payload = `data:${mimeType};base64,${asset.base64}`;
    const cover = { coverUrl: payload, coverPreviewUrl: asset.uri };
    setForm((current) => ({
      ...current,
      ...cover,
    }));
    setHintText(token ? 'AI 正在根据图片生成食谱草稿...' : '');

    if (!token) {
      return;
    }

    setDrafting(true);
    try {
      const result = await extractRecipeDraft(token, { image_base64: payload });
      setForm(buildFormFromDraft(result.recipe || {}, cover));
      setHintText(result.message || '已根据图片生成食谱草稿，可继续修改后保存。');
    } catch (error) {
      console.error('[AdminRecipes] recipe draft failed', error);
      setHintText(error instanceof Error ? error.message : '图片已上传，AI 草稿生成失败，请手动填写。');
    } finally {
      setDrafting(false);
    }
  }, [token]);

  const buildPayload = useCallback((): Partial<Recipe> => {
    const ingredients = form.ingredients
      .map((item) => ({
        name: item.name.trim(),
        amount: item.amount.trim(),
      }))
      .filter((item) => item.name);

    const steps = form.steps.map((item) => item.trim()).filter(Boolean);

    return {
      name: form.name.trim(),
      cuisine: form.cuisine.trim() || '家常',
      tags: normalizeTextItems(form.tags),
      suitable_for: normalizeTextItems(form.suitableFor),
      ingredients,
      steps,
      cover_url: form.coverUrl.trim() || undefined,
      source_url: form.sourceUrl.trim() || undefined,
      source_provider: form.sourceProvider.trim() || undefined,
    };
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      return;
    }

    if (!form.name.trim()) {
      setHintText('请先填写食谱名称');
      return;
    }

    if (!form.ingredients.some((item) => item.name.trim())) {
      setHintText('请至少填写一种食材');
      return;
    }

    if (!form.steps.some((item) => item.trim())) {
      setHintText('请至少填写一个制作步骤');
      return;
    }

    setSubmitting(true);
    setHintText('');
    try {
      const payload = buildPayload();
      let message = '';
      if (editingRecipeId) {
        const res = await updateRecipe(token, editingRecipeId, payload, 'server');
        setRecipes((current) =>
          current.map((item) => (Number(item.id) === editingRecipeId ? res.recipe : item)),
        );
        message = '服务器食谱已更新';
      } else {
        const res = await createRecipe(token, payload, 'server');
        setRecipes((current) => {
          const nextRecipes = current.filter((item) => Number(item.id) !== Number(res.recipe.id));
          return [res.recipe, ...nextRecipes];
        });
        message = res.created ? '服务器食谱已新增' : '服务器食谱已存在，已显示在列表中';
      }
      resetForm();
      setHintText(message);
      try {
        const refreshed = await fetchRecipes(token, undefined, undefined, 'server');
        setRecipes(refreshed.recipes || []);
      } catch (refreshError) {
        console.error('[AdminRecipes] refresh after submit failed', refreshError);
      }
    } catch (error) {
      console.error('[AdminRecipes] submit failed', error);
      setHintText(error instanceof Error ? error.message : '保存服务器食谱失败。');
    } finally {
      setSubmitting(false);
    }
  }, [buildPayload, editingRecipeId, form.ingredients, form.name, form.steps, resetForm, token]);

  const handleStartEdit = useCallback((recipe: Recipe) => {
    setEditingRecipeId(Number(recipe.id));
    setForm(buildFormFromRecipe(recipe));
    setHintText(`正在编辑《${recipe.name}》`);
  }, []);

  const handleDelete = useCallback(
    async (recipe: Recipe) => {
      if (!token) {
        return;
      }
      try {
        await deleteRecipe(token, Number(recipe.id), 'server');
        if (editingRecipeId === Number(recipe.id)) {
          resetForm();
        }
        setHintText(`已删除《${recipe.name}》`);
        await load();
      } catch (error) {
        console.error('[AdminRecipes] delete failed', error);
        setHintText(error instanceof Error ? error.message : '删除服务器食谱失败。');
      }
    },
    [editingRecipeId, load, resetForm, token],
  );

  const handleImportDemoRecipes = useCallback(async () => {
    if (!token) {
      return;
    }

    setImporting(true);
    setHintText('');
    try {
      const res = await fetchRecipes(token, undefined, undefined, 'server');
      const existingNameSet = new Set(
        (res.recipes || []).map((item) => item.name.trim().toLowerCase()).filter(Boolean),
      );
      const missingRecipes = DEMO_RECIPE_POSTS.filter(
        (item) => !existingNameSet.has(item.name.trim().toLowerCase()),
      );

      for (const recipe of missingRecipes) {
        await createRecipe(
          token,
          {
            name: recipe.name,
            cuisine: recipe.cuisine,
            tags: recipe.tags,
            suitable_for: recipe.suitableFor,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            cover_url: recipe.coverUrl,
            source_provider: 'demo',
          },
          'server',
        );
      }

      setHintText(
        missingRecipes.length === 0
          ? '服务器库已包含全部演示食谱'
          : `已导入 ${missingRecipes.length} 条演示食谱`,
      );
      await load();
    } catch (error) {
      console.error('[AdminRecipes] import demo failed', error);
      setHintText(error instanceof Error ? error.message : '导入演示食谱失败。');
    } finally {
      setImporting(false);
    }
  }, [load, token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="食谱库管理"
          subtitle="集中维护服务器食谱、封面与结构化信息，让推荐和识别结果保持一致。"
          backLabel="返回设置"
          eyebrow="管理后台"
          onBack={() => router.back()}
        />

        <View style={styles.previewCard}>
          <Pressable style={styles.coverPicker} onPress={handlePickCover} disabled={drafting}>
            {previewCoverSource ? (
              <Image
                source={previewCoverSource}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <RecipeCoverPlaceholder title={form.name || '食谱封面'} />
            )}
            <View style={styles.coverBadge}>
              <Camera size={16} color={palette.white} weight="bold" />
            </View>
            {drafting ? (
              <View style={styles.draftingOverlay}>
                <ActivityIndicator color={palette.white} />
                <Text style={styles.draftingText}>AI 识别食谱中...</Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.previewBody}>
            <Text style={styles.previewTitle}>{form.name.trim() || '未命名食谱'}</Text>
            <Text style={styles.previewMeta}>
              {form.cuisine.trim() || '家常'} · 服务器食谱库
            </Text>
            <Text style={styles.previewSummary}>{previewSummary}</Text>

            {normalizeTextItems(form.tags).length > 0 ? (
              <View style={styles.tagRow}>
                {normalizeTextItems(form.tags).map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {normalizeTextItems(form.suitableFor).length > 0 ? (
              <Text style={styles.previewHelper}>适宜人群：{normalizeTextItems(form.suitableFor).join('、')}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingRecipeId ? '编辑食谱资料' : '新增食谱资料'}</Text>

          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => handleChange('name', value)}
            placeholder="食谱名称"
            placeholderTextColor={palette.stone400}
          />
          <TextInput
            style={styles.input}
            value={form.cuisine}
            onChangeText={(value) => handleChange('cuisine', value)}
            placeholder="菜系，例如家常、轻食、粤式"
            placeholderTextColor={palette.stone400}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.summary}
            onChangeText={(value) => handleChange('summary', value)}
            placeholder="食谱简介，不填则自动用首个步骤生成"
            placeholderTextColor={palette.stone400}
            multiline
          />
          <TextInput
            style={styles.input}
            value={form.sourceProvider}
            onChangeText={(value) => handleChange('sourceProvider', value)}
            placeholder="来源标记，例如管理员整理、营养师提供"
            placeholderTextColor={palette.stone400}
          />
          <TextInput
            style={styles.input}
            value={form.sourceUrl}
            onChangeText={(value) => handleChange('sourceUrl', value)}
            placeholder="来源链接，可选"
            placeholderTextColor={palette.stone400}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>标签</Text>
            <Pressable style={styles.addInlineButton} onPress={() => addTextItem('tags')}>
              <Plus size={14} color={palette.orange500} weight="bold" />
              <Text style={styles.addInlineButtonText}>新增标签</Text>
            </Pressable>
          </View>

          {form.tags.map((item, index) => (
            <View key={`tag-${index}`} style={styles.textItemRow}>
              <TextInput
                style={[styles.input, styles.textItemInput]}
                value={item.value}
                onChangeText={(value) => updateTextItem('tags', index, value)}
                placeholder="填写一个标签，例如高蛋白"
                placeholderTextColor={palette.stone400}
              />
              <Pressable style={styles.iconButton} onPress={() => removeTextItem('tags', index)}>
                <Trash size={16} color={palette.imperial600} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>适宜人群</Text>
            <Pressable style={styles.addInlineButton} onPress={() => addTextItem('suitableFor')}>
              <Plus size={14} color={palette.orange500} weight="bold" />
              <Text style={styles.addInlineButtonText}>新增人群</Text>
            </Pressable>
          </View>

          {form.suitableFor.map((item, index) => (
            <View key={`suitable-${index}`} style={styles.textItemRow}>
              <TextInput
                style={[styles.input, styles.textItemInput]}
                value={item.value}
                onChangeText={(value) => updateTextItem('suitableFor', index, value)}
                placeholder="填写一个适宜人群，例如上班族"
                placeholderTextColor={palette.stone400}
              />
              <Pressable style={styles.iconButton} onPress={() => removeTextItem('suitableFor', index)}>
                <Trash size={16} color={palette.imperial600} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>食材清单</Text>
            <Pressable style={styles.addInlineButton} onPress={addIngredient}>
              <Plus size={14} color={palette.orange500} weight="bold" />
              <Text style={styles.addInlineButtonText}>新增食材</Text>
            </Pressable>
          </View>

          {form.ingredients.map((ingredient, index) => (
            <View key={`ingredient-${index}`} style={styles.rowCard}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                value={ingredient.name}
                onChangeText={(value) => updateIngredient(index, 'name', value)}
                placeholder="食材名称"
                placeholderTextColor={palette.stone400}
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                value={ingredient.amount}
                onChangeText={(value) => updateIngredient(index, 'amount', value)}
                placeholder="用量，例如 120g"
                placeholderTextColor={palette.stone400}
              />
              <Pressable style={styles.iconButton} onPress={() => removeIngredient(index)}>
                <Trash size={16} color={palette.imperial600} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>制作步骤</Text>
            <Pressable style={styles.addInlineButton} onPress={addStep}>
              <Plus size={14} color={palette.orange500} weight="bold" />
              <Text style={styles.addInlineButtonText}>新增步骤</Text>
            </Pressable>
          </View>

          {form.steps.map((step, index) => (
            <View key={`step-${index}`} style={styles.stepCard}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.stepInput]}
                value={step}
                onChangeText={(value) => updateStep(index, value)}
                placeholder="填写这一步的操作说明"
                placeholderTextColor={palette.stone400}
                multiline
              />
              <Pressable style={styles.iconButton} onPress={() => removeStep(index)}>
                <Trash size={16} color={palette.imperial600} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? '保存中...' : editingRecipeId ? '保存修改' : '新增到服务器库'}
            </Text>
          </Pressable>

          {editingRecipeId ? (
            <Pressable style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>取消编辑</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.secondaryButton, importing ? styles.secondaryButtonDisabled : undefined]}
            onPress={handleImportDemoRecipes}
            disabled={importing}
          >
            <Text style={styles.secondaryButtonText}>
              {importing ? '导入中...' : '导入演示食谱到服务器库'}
            </Text>
          </Pressable>
          {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>服务器库已有食谱</Text>
          {managedRecipes.length === 0 ? (
            <Text style={styles.emptyText}>暂无服务器食谱。</Text>
          ) : (
            managedRecipes.map((recipe) => (
              <View key={recipe.id} style={styles.recipeItem}>
                <View style={styles.recipeTextGroup}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <Text style={styles.recipeMeta}>
                    {recipe.cuisine || '未分类'} · {(recipe.tags || []).join('、') || '无标签'}
                  </Text>
                </View>
                <View style={styles.recipeActions}>
                  <Pressable style={styles.inlineActionButton} onPress={() => handleStartEdit(recipe)}>
                    <Text style={styles.inlineActionText}>编辑</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.inlineActionButton, styles.deleteActionButton]}
                    onPress={() => handleDelete(recipe)}
                  >
                    <Text style={[styles.inlineActionText, styles.deleteActionText]}>删除</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.surface,
    },
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 36,
    },
    previewCard: {
      backgroundColor: palette.white,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.stone100,
      overflow: 'hidden',
    },
    coverPicker: {
      position: 'relative',
      backgroundColor: palette.surfaceWarm,
    },
    coverImage: {
      width: '100%',
      height: 220,
      backgroundColor: palette.stone100,
    },
    coverBadge: {
      position: 'absolute',
      right: 14,
      bottom: 14,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.orange500,
      borderWidth: 2,
      borderColor: palette.white,
    },
    draftingOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(17, 17, 17, 0.42)',
    },
    draftingText: {
      color: palette.white,
      fontSize: 13,
      fontWeight: '700',
    },
    previewBody: {
      padding: 16,
      gap: 10,
    },
    previewTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: palette.stone900,
    },
    previewMeta: {
      fontSize: 13,
      color: palette.stone500,
    },
    previewSummary: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone700,
    },
    previewHelper: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tagPill: {
      borderRadius: 999,
      backgroundColor: palette.gold50,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    addInlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    addInlineButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    multilineInput: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    textItemRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    textItemInput: {
      flex: 1,
    },
    rowCard: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    rowInput: {
      flex: 1,
    },
    stepCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    stepIndex: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: palette.gold100,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    stepIndexText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
    },
    stepInput: {
      flex: 1,
      minHeight: 82,
      textAlignVertical: 'top',
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.imperial50,
      borderWidth: 1,
      borderColor: palette.imperial100,
      marginTop: 2,
    },
    primaryButton: {
      backgroundColor: palette.stone900,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: palette.gold50,
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: palette.surfaceWarm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.stone200,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButtonDisabled: {
      opacity: 0.7,
    },
    secondaryButtonText: {
      color: palette.stone800,
      fontWeight: '700',
    },
    hintText: {
      fontSize: 13,
      color: palette.stone600,
      lineHeight: 20,
    },
    emptyText: {
      color: palette.stone500,
      fontSize: 14,
    },
    recipeItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    recipeTextGroup: {
      flex: 1,
      gap: 4,
    },
    recipeName: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone800,
    },
    recipeMeta: {
      fontSize: 12,
      color: palette.stone500,
    },
    recipeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    inlineActionButton: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
    },
    inlineActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    deleteActionButton: {
      borderColor: palette.imperial400,
      backgroundColor: palette.imperial50,
    },
    deleteActionText: {
      color: palette.imperial600,
    },
  });
}
