import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { GBD_CHRONIC_DISEASE_TREE, type GbdChronicDiseaseNode } from '@/constants/gbd-chronic-diseases';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { primeNutritionExperience } from '@/services/nutrition-prime';
import { notifyNutritionRefresh } from '@/services/nutrition-refresh';
import { fetchProfile, updateProfile } from '@/services/profile';
import type { HealthProfile } from '@/types/profile';

const GENDER_OPTIONS = ['男', '女', '其他'] as const;
const YEAR_ITEM_HEIGHT = 44;
const NO_CHRONIC_DISEASE_LABEL = '无慢性病';

type ChronicFlatItem = {
  id: number;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  path: string;
};

type ChronicTreeRow = {
  id: number;
  depth: number;
  name: string;
  hasChildren: boolean;
  expanded: boolean;
};

function normalizeKeyword(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）\-_/.,，。]/g, '');
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [profile, setProfile] = useState<HealthProfile>({});
  const [saving, setSaving] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [pendingYear, setPendingYear] = useState<number | undefined>(undefined);
  const yearListRef = useRef<FlatList<number>>(null);

  const [chronicPickerVisible, setChronicPickerVisible] = useState(false);
  const [chronicSearchKeyword, setChronicSearchKeyword] = useState('');
  const [expandedChronicIds, setExpandedChronicIds] = useState<Set<number>>(
    new Set(GBD_CHRONIC_DISEASE_TREE.map((item) => item.id)),
  );
  const [selectedChronicIds, setSelectedChronicIds] = useState<number[]>([]);
  const [legacyChronicNames, setLegacyChronicNames] = useState<string[]>([]);
  const [hasNoChronicDisease, setHasNoChronicDisease] = useState(false);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 150;
    const years: number[] = [];
    for (let year = currentYear; year >= minYear; year -= 1) {
      years.push(year);
    }
    return years;
  }, []);

  const chronicIndex = useMemo(() => {
    const idToNode = new Map<number, GbdChronicDiseaseNode>();
    const normalizedNameToId = new Map<string, number>();
    const flatItems: ChronicFlatItem[] = [];

    const bindAlias = (id: number, alias?: string) => {
      if (!alias) {
        return;
      }
      const key = normalizeKeyword(alias);
      if (!key || normalizedNameToId.has(key)) {
        return;
      }
      normalizedNameToId.set(key, id);
    };

    const walk = (nodes: GbdChronicDiseaseNode[], path: string[]) => {
      nodes.forEach((node) => {
        idToNode.set(node.id, node);
        bindAlias(node.id, node.name);
        bindAlias(node.id, node.nameEn);
        bindAlias(node.id, node.shortName);
        bindAlias(node.id, node.shortNameEn);
        bindAlias(node.id, node.code);
        const nextPath = [...path, node.name];
        flatItems.push({
          id: node.id,
          name: node.name,
          nameEn: node.nameEn,
          shortName: node.shortName,
          shortNameEn: node.shortNameEn,
          path: nextPath.join(' / '),
        });
        if (node.children.length > 0) {
          walk(node.children, nextPath);
        }
      });
    };

    walk(GBD_CHRONIC_DISEASE_TREE, []);
    return { idToNode, normalizedNameToId, flatItems };
  }, []);

  const selectedChronicItems = useMemo(
    () => selectedChronicIds.map((id) => chronicIndex.idToNode.get(id)).filter(Boolean) as GbdChronicDiseaseNode[],
    [selectedChronicIds, chronicIndex.idToNode],
  );

  const chronicSearchResults = useMemo(() => {
    const keyword = normalizeKeyword(chronicSearchKeyword);
    if (!keyword) {
      return [];
    }
    return chronicIndex.flatItems
      .filter((item) => {
        const nameHit = normalizeKeyword(item.name).includes(keyword);
        const enHit = normalizeKeyword(item.nameEn).includes(keyword);
        const shortHit = normalizeKeyword(item.shortName).includes(keyword);
        const shortEnHit = normalizeKeyword(item.shortNameEn).includes(keyword);
        return nameHit || enHit || shortHit || shortEnHit;
      })
      .slice(0, 300);
  }, [chronicIndex.flatItems, chronicSearchKeyword]);

  const visibleChronicTreeRows = useMemo(() => {
    const rows: ChronicTreeRow[] = [];
    const walk = (nodes: GbdChronicDiseaseNode[], depth: number) => {
      nodes.forEach((node) => {
        const hasChildren = node.children.length > 0;
        const expanded = expandedChronicIds.has(node.id);
        rows.push({
          id: node.id,
          depth,
          name: node.name,
          hasChildren,
          expanded,
        });
        if (hasChildren && expanded) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(GBD_CHRONIC_DISEASE_TREE, 0);
    return rows;
  }, [expandedChronicIds]);

  const hasAnyChronicSelected = hasNoChronicDisease || selectedChronicIds.length > 0 || legacyChronicNames.length > 0;

  useEffect(() => {
    const selectedNames = selectedChronicIds
      .map((id) => chronicIndex.idToNode.get(id)?.name)
      .filter(Boolean) as string[];
    const nextConditions = hasNoChronicDisease ? [NO_CHRONIC_DISEASE_LABEL] : [...selectedNames, ...legacyChronicNames];
    setProfile((prev) => {
      const current = prev.chronic_conditions || [];
      const isSame =
        current.length === nextConditions.length &&
        current.every((item, index) => item === nextConditions[index]);
      if (isSame) {
        return prev;
      }
      return {
        ...prev,
        chronic_conditions: nextConditions,
      };
    });
  }, [selectedChronicIds, legacyChronicNames, chronicIndex.idToNode, hasNoChronicDisease]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchProfile(token)
      .then((res) => {
        const nextProfile = res.profile || {};
        setProfile(nextProfile);
        const sourceNames = (nextProfile.chronic_conditions || []).filter(Boolean);
        const hasNoneSelected = sourceNames.includes(NO_CHRONIC_DISEASE_LABEL);
        const matchedIds: number[] = [];
        const unknownNames: string[] = [];
        sourceNames
          .filter((name) => name !== NO_CHRONIC_DISEASE_LABEL)
          .forEach((name) => {
          const id = chronicIndex.normalizedNameToId.get(normalizeKeyword(name));
          if (!id) {
            unknownNames.push(name);
            return;
          }
          if (!matchedIds.includes(id)) {
            matchedIds.push(id);
          }
        });
        setSelectedChronicIds(matchedIds);
        setLegacyChronicNames(unknownNames);
        setHasNoChronicDisease(hasNoneSelected);
      })
      .catch(() => {});
  }, [token, chronicIndex.normalizedNameToId]);

  const handleSave = async () => {
    if (!token) {
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile(profile, token);
      setProfile(res.profile || {});
      notifyNutritionRefresh('profile');
      void primeNutritionExperience(token);
      router.back();
    } catch (error) {
      console.error('[Profile] save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleChronicById = (id: number) => {
    setHasNoChronicDisease(false);
    setSelectedChronicIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleChronicExpanded = (id: number) => {
    setExpandedChronicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeLegacyChronicName = (name: string) => {
    setLegacyChronicNames((prev) => prev.filter((item) => item !== name));
  };

  const toggleNoChronicDisease = () => {
    setHasNoChronicDisease((prev) => {
      const next = !prev;
      if (next) {
        setSelectedChronicIds([]);
        setLegacyChronicNames([]);
      }
      return next;
    });
  };

  const clearChronicSelection = () => {
    setSelectedChronicIds([]);
    setLegacyChronicNames([]);
    setHasNoChronicDisease(false);
  };

  const fallbackYear = yearOptions[Math.min(25, yearOptions.length - 1)];

  const normalizeYear = (value?: number | null) => {
    if (!value) {
      return fallbackYear;
    }
    const maxYear = yearOptions[0];
    const minYear = yearOptions[yearOptions.length - 1];
    if (value > maxYear) {
      return maxYear;
    }
    if (value < minYear) {
      return minYear;
    }
    return value;
  };

  const scrollToYear = (year: number, animated: boolean) => {
    const index = yearOptions.indexOf(year);
    if (index < 0) {
      return;
    }
    yearListRef.current?.scrollToIndex({ index, animated });
  };

  const openYearPicker = () => {
    const initialYear = normalizeYear(profile.birth_year);
    setPendingYear(initialYear);
    setYearPickerVisible(true);
    // Android 上弹层初次打开时，FlatList 可能还未完成测量，延后一点滚动可避免“拉不动”。
    setTimeout(() => {
      scrollToYear(initialYear, false);
    }, 40);
  };

  const syncPendingYearByOffset = (offsetY: number) => {
    const safeOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
    const rawIndex = Math.round(safeOffsetY / YEAR_ITEM_HEIGHT);
    const index = Math.min(Math.max(rawIndex, 0), yearOptions.length - 1);
    const nextYear = yearOptions[index];
    setPendingYear((prev) => (prev === nextYear ? prev : nextYear));
  };

  const snapYearByOffset = (offsetY: number, animated: boolean) => {
    const rawIndex = Math.round(offsetY / YEAR_ITEM_HEIGHT);
    const index = Math.min(Math.max(rawIndex, 0), yearOptions.length - 1);
    yearListRef.current?.scrollToOffset({ offset: index * YEAR_ITEM_HEIGHT, animated });
    const nextYear = yearOptions[index];
    setPendingYear((prev) => (prev === nextYear ? prev : nextYear));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>健康档案</Text>

        <View style={styles.card}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>性别</Text>
            <View style={styles.optionGroup}>
              {GENDER_OPTIONS.map((option) => {
                const active = profile.gender === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => setProfile((prev) => ({ ...prev, gender: option }))}
                  >
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>出生年份</Text>
            <Pressable style={styles.formPicker} onPress={openYearPicker}>
              <Text style={profile.birth_year ? styles.formPickerValue : styles.formPickerPlaceholder}>
                {profile.birth_year ? String(profile.birth_year) : '请选择出生年份'}
              </Text>
              <Text style={styles.formPickerArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>身高(cm)</Text>
            <TextInput
              style={styles.formInput}
              value={profile.height_cm ? String(profile.height_cm) : ''}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, height_cm: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="例如 165"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>体重(kg)</Text>
            <TextInput
              style={styles.formInput}
              value={profile.weight_kg ? String(profile.weight_kg) : ''}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, weight_kg: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="例如 60"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.formLabel}>慢性病标签</Text>
            <View style={styles.tagGroup}>
              {hasNoChronicDisease ? (
                <Pressable style={styles.tagChipNone} onPress={toggleNoChronicDisease}>
                  <Text style={styles.tagChipNoneText}>{NO_CHRONIC_DISEASE_LABEL}</Text>
                  <Text style={styles.tagChipRemoveText}>×</Text>
                </Pressable>
              ) : null}

              {selectedChronicItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.tagChipActive}
                  onPress={() => toggleChronicById(item.id)}
                >
                  <Text style={styles.tagChipActiveText}>{item.name}</Text>
                  <Text style={styles.tagChipRemoveText}>×</Text>
                </Pressable>
              ))}

              {legacyChronicNames.map((item) => (
                <Pressable
                  key={`legacy-${item}`}
                  style={styles.tagChipLegacy}
                  onPress={() => removeLegacyChronicName(item)}
                >
                  <Text style={styles.tagChipLegacyText}>{item}</Text>
                  <Text style={styles.tagChipRemoveText}>×</Text>
                </Pressable>
              ))}

              <Pressable
                style={[styles.addTagChip, !hasAnyChronicSelected && styles.addTagChipOnly]}
                onPress={() => setChronicPickerVisible(true)}
              >
                <Text style={styles.addTagChipText}>{hasAnyChronicSelected ? '＋ 添加慢性病' : '＋'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存档案'}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <View style={styles.modalMask}>
          <Pressable style={styles.modalDismissLayer} onPress={() => setYearPickerVisible(false)} />
          <View style={styles.yearModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择出生年份</Text>
              <Pressable onPress={() => setYearPickerVisible(false)}>
                <Text style={styles.modalCloseText}>关闭</Text>
              </Pressable>
            </View>

            <View style={styles.yearWheelContainer}>
              <FlatList
                ref={yearListRef}
                data={yearOptions}
                keyExtractor={(item) => String(item)}
                getItemLayout={(_, index) => ({
                  length: YEAR_ITEM_HEIGHT,
                  offset: YEAR_ITEM_HEIGHT * index,
                  index,
                })}
                onScrollToIndexFailed={({ index }) => {
                  const boundedIndex = Math.min(Math.max(index, 0), yearOptions.length - 1);
                  yearListRef.current?.scrollToOffset({
                    offset: boundedIndex * YEAR_ITEM_HEIGHT,
                    animated: false,
                  });
                  setTimeout(() => {
                    yearListRef.current?.scrollToIndex({ index: boundedIndex, animated: false });
                  }, 40);
                }}
                showsVerticalScrollIndicator={false}
                snapToInterval={YEAR_ITEM_HEIGHT}
                disableIntervalMomentum
                decelerationRate="normal"
                nestedScrollEnabled={false}
                overScrollMode="never"
                scrollEnabled
                scrollEventThrottle={16}
                contentContainerStyle={styles.yearWheelContent}
                onScroll={(event) => syncPendingYearByOffset(event.nativeEvent.contentOffset.y)}
                onMomentumScrollEnd={(event) => snapYearByOffset(event.nativeEvent.contentOffset.y, false)}
                onScrollEndDrag={(event) => {
                  const velocityY = Math.abs(event.nativeEvent.velocity?.y || 0);
                  if (velocityY < 0.08) {
                    snapYearByOffset(event.nativeEvent.contentOffset.y, true);
                  }
                }}
                renderItem={({ item }) => {
                  const active = item === pendingYear;
                  return (
                    <View style={[styles.yearWheelItem, active && styles.yearWheelItemActive]}>
                      <Text style={[styles.yearWheelItemText, active && styles.yearWheelItemTextActive]}>
                        {item}
                      </Text>
                    </View>
                  );
                }}
              />
              <View pointerEvents="none" style={styles.yearWheelCenterMask} />
            </View>

            <Text style={styles.yearPreviewText}>
              {pendingYear ? `当前选择：${pendingYear} 年` : '请选择出生年份'}
            </Text>

            <View style={styles.modalActionRow}>
              <Pressable
                style={styles.modalActionButton}
                onPress={() => {
                  setProfile((prev) => ({ ...prev, birth_year: undefined }));
                  setYearPickerVisible(false);
                }}
              >
                <Text style={styles.modalActionButtonText}>清空</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
                onPress={() => {
                  if (pendingYear) {
                    setProfile((prev) => ({ ...prev, birth_year: pendingYear }));
                  }
                  setYearPickerVisible(false);
                }}
              >
                <Text style={[styles.modalActionButtonText, styles.modalActionButtonTextPrimary]}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={chronicPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChronicPickerVisible(false)}
      >
        <View style={styles.modalMask}>
          <Pressable style={styles.modalDismissLayer} onPress={() => setChronicPickerVisible(false)} />
          <View style={styles.chronicModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择慢性病（GBD）</Text>
              <Pressable onPress={() => setChronicPickerVisible(false)}>
                <Text style={styles.modalCloseText}>关闭</Text>
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                value={chronicSearchKeyword}
                onChangeText={setChronicSearchKeyword}
                placeholder="搜索慢性病名称"
                placeholderTextColor={palette.stone400}
              />
              {chronicSearchKeyword ? (
                <Pressable onPress={() => setChronicSearchKeyword('')}>
                  <Text style={styles.searchClearText}>清空</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={[styles.noneChronicButton, hasNoChronicDisease && styles.noneChronicButtonActive]}
              onPress={toggleNoChronicDisease}
            >
              <View style={[styles.selectMarker, hasNoChronicDisease && styles.selectMarkerActive]} />
              <Text style={[styles.noneChronicButtonText, hasNoChronicDisease && styles.noneChronicButtonTextActive]}>
                {NO_CHRONIC_DISEASE_LABEL}
              </Text>
            </Pressable>

            <ScrollView style={styles.chronicList} contentContainerStyle={styles.chronicListContent}>
              {chronicSearchKeyword ? (
                chronicSearchResults.length === 0 ? (
                  <Text style={styles.emptySearchText}>没有匹配结果</Text>
                ) : (
                  chronicSearchResults.map((item) => {
                    const selected = selectedChronicIds.includes(item.id);
                    return (
                      <Pressable
                        key={`search-${item.id}`}
                        style={[styles.searchResultRow, selected && styles.searchResultRowActive]}
                        onPress={() => toggleChronicById(item.id)}
                      >
                        <View style={[styles.selectMarker, selected && styles.selectMarkerActive]} />
                        <View style={styles.searchResultTextWrap}>
                          <Text style={[styles.searchResultTitle, selected && styles.searchResultTitleActive]}>
                            {item.name}
                          </Text>
                          <Text style={styles.searchResultPath} numberOfLines={1}>
                            {item.path}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )
              ) : (
                visibleChronicTreeRows.map((row) => {
                  const selected = selectedChronicIds.includes(row.id);
                  return (
                    <View key={`tree-${row.id}`} style={[styles.treeRow, { paddingLeft: 8 + row.depth * 16 }]}>
                      {row.hasChildren ? (
                        <Pressable style={styles.expandButton} onPress={() => toggleChronicExpanded(row.id)}>
                          <Text style={styles.expandButtonText}>{row.expanded ? '⌄' : '›'}</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.expandPlaceholder} />
                      )}
                      <Pressable style={styles.treeSelectArea} onPress={() => toggleChronicById(row.id)}>
                        <View style={[styles.selectMarker, selected && styles.selectMarkerActive]} />
                        <Text style={[styles.treeRowText, selected && styles.treeRowTextActive]}>{row.name}</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.chronicFooter}>
              <Text style={styles.chronicFooterText}>
                已选 {selectedChronicIds.length + legacyChronicNames.length + (hasNoChronicDisease ? 1 : 0)} 项
              </Text>
              <View style={styles.chronicFooterActions}>
                <Pressable style={styles.footerGhostButton} onPress={clearChronicSelection}>
                  <Text style={styles.footerGhostButtonText}>清空</Text>
                </Pressable>
                <Pressable style={styles.footerPrimaryButton} onPress={() => setChronicPickerVisible(false)}>
                  <Text style={styles.footerPrimaryButtonText}>完成</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingBottom: 32,
      gap: 16,
      flexGrow: 1,
    },
    backText: {
      color: palette.blue500,
      fontSize: 14,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.stone900,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionBlock: {
      gap: 10,
    },
    formLabel: {
      width: 80,
      fontSize: 14,
      color: palette.stone600,
    },
    optionGroup: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    optionChip: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionChipActive: {
      backgroundColor: palette.stone900,
      borderColor: palette.stone900,
    },
    optionChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone600,
    },
    optionChipTextActive: {
      color: palette.white,
    },
    formInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    formPicker: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surfaceWarm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    formPickerValue: {
      fontSize: 14,
      color: palette.stone800,
      fontWeight: '600',
    },
    formPickerPlaceholder: {
      fontSize: 14,
      color: palette.stone400,
    },
    formPickerArrow: {
      fontSize: 20,
      color: palette.stone400,
      lineHeight: 20,
    },
    tagGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tagChipActive: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.gold300,
      backgroundColor: palette.gold100,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tagChipActiveText: {
      fontSize: 13,
      color: palette.stone900,
      fontWeight: '700',
    },
    tagChipLegacy: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone300,
      backgroundColor: palette.stone100,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tagChipLegacyText: {
      fontSize: 13,
      color: palette.stone700,
      fontWeight: '600',
    },
    tagChipNone: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.green500,
      backgroundColor: '#EAF8EA',
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tagChipNoneText: {
      fontSize: 13,
      color: palette.green500,
      fontWeight: '700',
    },
    tagChipRemoveText: {
      fontSize: 14,
      color: palette.stone500,
      lineHeight: 14,
    },
    addTagChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone300,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 12,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTagChipOnly: {
      minWidth: 42,
      paddingHorizontal: 0,
    },
    addTagChipText: {
      fontSize: 13,
      color: palette.stone700,
      fontWeight: '700',
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
    modalMask: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalDismissLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    yearModalCard: {
      backgroundColor: palette.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.stone100,
      maxHeight: '68%',
      padding: 16,
      gap: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    modalCloseText: {
      fontSize: 13,
      color: palette.blue500,
      fontWeight: '600',
    },
    yearWheelContainer: {
      height: YEAR_ITEM_HEIGHT * 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      overflow: 'hidden',
    },
    yearWheelContent: {
      paddingVertical: YEAR_ITEM_HEIGHT * 2,
    },
    yearWheelItem: {
      height: YEAR_ITEM_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearWheelItemActive: {
      backgroundColor: palette.gold100,
    },
    yearWheelItemText: {
      fontSize: 18,
      color: palette.stone500,
      fontWeight: '600',
    },
    yearWheelItemTextActive: {
      color: palette.stone900,
      fontWeight: '800',
    },
    yearWheelCenterMask: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: YEAR_ITEM_HEIGHT * 2,
      height: YEAR_ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: palette.gold300,
    },
    yearPreviewText: {
      fontSize: 13,
      color: palette.stone600,
      textAlign: 'center',
      fontWeight: '600',
    },
    modalActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modalActionButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.stone100,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modalActionButtonPrimary: {
      backgroundColor: palette.stone900,
      borderColor: palette.stone900,
    },
    modalActionButtonText: {
      fontSize: 13,
      color: palette.stone600,
      fontWeight: '700',
    },
    modalActionButtonTextPrimary: {
      color: palette.gold50,
    },
    chronicModalCard: {
      backgroundColor: palette.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.stone100,
      maxHeight: '80%',
      padding: 16,
      gap: 12,
    },
    searchBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: palette.stone800,
      paddingVertical: 4,
    },
    searchClearText: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '600',
    },
    noneChronicButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.stone200,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    noneChronicButtonActive: {
      borderColor: palette.green500,
      backgroundColor: '#EAF8EA',
    },
    noneChronicButtonText: {
      fontSize: 14,
      color: palette.stone700,
      fontWeight: '700',
    },
    noneChronicButtonTextActive: {
      color: palette.green500,
    },
    chronicList: {
      maxHeight: 380,
      borderWidth: 1,
      borderColor: palette.stone100,
      borderRadius: 12,
      backgroundColor: palette.surfaceWarm,
    },
    chronicListContent: {
      paddingVertical: 8,
    },
    emptySearchText: {
      fontSize: 13,
      color: palette.stone500,
      textAlign: 'center',
      paddingVertical: 20,
    },
    treeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 10,
      minHeight: 34,
    },
    expandButton: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandButtonText: {
      fontSize: 14,
      color: palette.stone500,
      fontWeight: '700',
      lineHeight: 14,
    },
    expandPlaceholder: {
      width: 24,
      height: 24,
    },
    treeSelectArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 5,
    },
    selectMarker: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: palette.stone300,
      backgroundColor: palette.white,
    },
    selectMarkerActive: {
      backgroundColor: palette.stone900,
      borderColor: palette.stone900,
    },
    treeRowText: {
      fontSize: 13,
      color: palette.stone700,
      flex: 1,
    },
    treeRowTextActive: {
      color: palette.stone900,
      fontWeight: '700',
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    searchResultRowActive: {
      backgroundColor: palette.gold50,
    },
    searchResultTextWrap: {
      flex: 1,
      gap: 2,
    },
    searchResultTitle: {
      fontSize: 13,
      color: palette.stone800,
      fontWeight: '600',
    },
    searchResultTitleActive: {
      color: palette.stone900,
      fontWeight: '700',
    },
    searchResultPath: {
      fontSize: 11,
      color: palette.stone500,
    },
    chronicFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    chronicFooterText: {
      fontSize: 12,
      color: palette.stone600,
      fontWeight: '600',
    },
    chronicFooterActions: {
      flexDirection: 'row',
      gap: 8,
    },
    footerGhostButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.stone200,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.stone100,
    },
    footerGhostButtonText: {
      fontSize: 12,
      color: palette.stone600,
      fontWeight: '700',
    },
    footerPrimaryButton: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: palette.stone900,
    },
    footerPrimaryButtonText: {
      fontSize: 12,
      color: palette.gold50,
      fontWeight: '700',
    },
  });
}
