# AI 视觉识图 Skill

用于饮食记录页的识图规则，目标是把图片拆成可计量、可落库、可用于营养分析的食物项，而不是只猜一个大菜名。

## 核心原则

1. 先判断做法，再拆食材。
2. 主食材、蔬菜、酱料、明显油脂都要分别考虑。
3. 中式热菜看到挂汁、厚酱、盘底有汁、明显油光时，不能只返回主食材。
4. 无法确认具体酱料时，要落到通用项，例如 `咸味酱汁`、`勾芡酱汁`、`食用油`。
5. notes 必须解释依据，例如“表面有厚酱”“盘底有油汁”“疑似勾芡”。

## 当前目录重点项

- 主蛋白：`beef`、`chicken-breast`、`shrimp`、`egg`、`tofu`
- 蔬菜：`bok-choy`、`broccoli`、`spinach`、`cabbage`
- 调味与油脂：`satay-sauce`、`soy-sauce`、`chili-oil`、`savory-sauce`、`thick-gravy`、`cooking-oil`

## 典型案例

- 沙茶酱牛肉：
  - 至少检查 `beef` + `satay-sauce`
  - 若油光明显，再补 `cooking-oil`
- 勾芡炒菜：
  - 主食材 + `thick-gravy`
- 盘底有明显红油：
  - 主食材 + `chili-oil` 或 `cooking-oil`
