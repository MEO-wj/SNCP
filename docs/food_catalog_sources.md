# 食物库营养数据来源

前端手动录入食物库位于 `SNCP-app/constants/food-catalog.ts`。

## 数据来源

- USDA FoodData Central，数据类型：SR Legacy。
- 使用场景：为录入弹窗提供常见食物的每 100g 营养值。
- 记录字段：能量、蛋白质、脂肪、碳水化合物、膳食纤维、钠、总糖。

每条食物都保留 `source.fdcId` 和 USDA 原始英文 `description`，方便回查原始条目。

## 单位规则

- USDA SR Legacy 的营养值按每 100g 食物记录。
- 应用保存时仍保存 `nutritionPer100g`。
- 实际录入克重通过 `weight_g / 100` 换算到本餐营养值。

## 使用约束

- 同一种食物的营养会因产地、品牌、烹调方式、加盐加油而变化。
- 食用油、酱油、盐、酱料等调味品需单独录入，否则主食和菜品本身不会自动包含额外调味营养。
