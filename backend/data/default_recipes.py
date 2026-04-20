from __future__ import annotations

from typing import Any


def _nutrition(
    calories: float,
    protein: float,
    fat: float,
    carbs: float,
    fiber: float,
    sodium: float,
    sugar: float,
) -> dict[str, float]:
    return {
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs,
        "fiber": fiber,
        "sodium": sodium,
        "sugar": sugar,
    }


DEFAULT_RECIPES: list[dict[str, Any]] = [
    {
        "id": -1,
        "name": "山药小米南瓜粥",
        "cuisine": "家常",
        "tags": ["早餐", "养胃", "低负担"],
        "suitable_for": ["中老年人群", "肠胃敏感", "清淡饮食"],
        "ingredients": [
            {"name": "南瓜", "amount": "120g"},
            {"name": "山药", "amount": "100g"},
            {"name": "小米", "amount": "50g"},
            {"name": "清水", "amount": "700ml"},
        ],
        "steps": [
            "南瓜和山药去皮切块，小米淘洗干净备用。",
            "锅中加水煮开后放入小米，转中小火煮 10 分钟。",
            "加入南瓜和山药继续煮 15 到 20 分钟，煮到软糯即可。",
            "关火焖 5 分钟后搅匀，作为早餐或晚餐都比较合适。",
        ],
        "nutrition": _nutrition(182, 4.8, 1.9, 37.4, 3.2, 28, 7.6),
    },
    {
        "id": -2,
        "name": "番茄炒蛋",
        "cuisine": "家常",
        "tags": ["家常菜", "快手", "高蛋白"],
        "suitable_for": ["普通家庭", "食欲欠佳", "均衡饮食"],
        "ingredients": [
            {"name": "番茄", "amount": "2个"},
            {"name": "鸡蛋", "amount": "2个"},
            {"name": "葱花", "amount": "适量"},
            {"name": "食用油", "amount": "1小勺"},
        ],
        "steps": [
            "番茄切块，鸡蛋打散备用。",
            "热锅少油先炒鸡蛋，凝固后盛出。",
            "用余油翻炒番茄至出汁，再倒回鸡蛋翻匀。",
            "少量调味后撒葱花出锅，适合搭配米饭或杂粮饭。",
        ],
        "nutrition": _nutrition(208, 11.9, 13.8, 8.7, 1.7, 186, 5.9),
    },
    {
        "id": -3,
        "name": "清蒸鲈鱼",
        "cuisine": "粤式",
        "tags": ["低盐", "高蛋白", "晚餐"],
        "suitable_for": ["高血压人群", "控盐饮食", "术后恢复"],
        "ingredients": [
            {"name": "鲈鱼", "amount": "1条约 400g"},
            {"name": "姜丝", "amount": "适量"},
            {"name": "葱丝", "amount": "适量"},
            {"name": "低钠酱油", "amount": "1小勺"},
        ],
        "steps": [
            "鲈鱼处理干净后在鱼身划刀，铺上姜丝。",
            "水开后上锅蒸 8 到 10 分钟，关火再焖 2 分钟。",
            "倒掉多余汤汁，铺上葱丝。",
            "淋少量低钠酱油即可，尽量保留鱼本身鲜味。",
        ],
        "nutrition": _nutrition(236, 31.2, 10.8, 3.2, 0.3, 168, 1.2),
    },
    {
        "id": -4,
        "name": "西兰花虾仁",
        "cuisine": "家常",
        "tags": ["高蛋白", "低脂", "午餐"],
        "suitable_for": ["减脂期", "控糖饮食", "上班族"],
        "ingredients": [
            {"name": "西兰花", "amount": "180g"},
            {"name": "虾仁", "amount": "120g"},
            {"name": "蒜末", "amount": "适量"},
            {"name": "食用油", "amount": "1小勺"},
        ],
        "steps": [
            "西兰花切小朵焯水，虾仁去腥备用。",
            "热锅少油，下蒜末和虾仁快速翻炒至变色。",
            "加入西兰花翻炒均匀，少量调味即可。",
            "全程少油快炒，适合作为高蛋白配菜。",
        ],
        "nutrition": _nutrition(192, 24.6, 6.8, 9.4, 3.6, 214, 1.8),
    },
    {
        "id": -5,
        "name": "冬瓜排骨汤",
        "cuisine": "家常",
        "tags": ["汤品", "清淡", "补水"],
        "suitable_for": ["夏季饮食", "清淡晚餐", "普通家庭"],
        "ingredients": [
            {"name": "冬瓜", "amount": "250g"},
            {"name": "排骨", "amount": "180g"},
            {"name": "姜片", "amount": "2片"},
            {"name": "葱段", "amount": "适量"},
        ],
        "steps": [
            "排骨焯水后洗净，冬瓜切块备用。",
            "排骨与姜片加水炖 30 分钟左右。",
            "加入冬瓜继续煮 15 分钟至透明软熟。",
            "出锅前少量调味，适合搭配杂粮主食。",
        ],
        "nutrition": _nutrition(224, 17.5, 12.3, 8.4, 1.1, 162, 2.4),
    },
    {
        "id": -6,
        "name": "芹菜香干",
        "cuisine": "家常",
        "tags": ["高纤维", "少油", "家常菜"],
        "suitable_for": ["控脂饮食", "便秘困扰", "家常搭配"],
        "ingredients": [
            {"name": "芹菜", "amount": "180g"},
            {"name": "香干", "amount": "120g"},
            {"name": "蒜片", "amount": "适量"},
            {"name": "食用油", "amount": "1小勺"},
        ],
        "steps": [
            "芹菜切段，香干切条备用。",
            "热锅少油爆香蒜片，下香干翻炒出香味。",
            "加入芹菜快速翻炒至断生。",
            "少量调味即可，适合作为高纤维家常配菜。",
        ],
        "nutrition": _nutrition(163, 11.6, 8.1, 10.2, 3.4, 286, 3.1),
    },
    {
        "id": -7,
        "name": "玉米胡萝卜蒸肉饼",
        "cuisine": "家常",
        "tags": ["蒸菜", "高蛋白", "家庭餐"],
        "suitable_for": ["儿童友好", "中老年人群", "少油饮食"],
        "ingredients": [
            {"name": "猪里脊肉末", "amount": "180g"},
            {"name": "玉米粒", "amount": "50g"},
            {"name": "胡萝卜末", "amount": "40g"},
            {"name": "葱姜水", "amount": "2勺"},
        ],
        "steps": [
            "肉末加入葱姜水顺时针搅打上劲。",
            "拌入玉米粒和胡萝卜末，整理成圆饼状。",
            "冷水上锅蒸 12 到 15 分钟至熟透。",
            "蒸制方式更省油，适合家庭长期轮换食用。",
        ],
        "nutrition": _nutrition(258, 20.4, 13.6, 10.8, 1.8, 238, 3.7),
    },
    {
        "id": -8,
        "name": "菠菜豆腐蛋花汤",
        "cuisine": "家常",
        "tags": ["低脂", "补铁", "晚餐"],
        "suitable_for": ["低脂饮食", "需要叶酸补充人群", "清淡收口"],
        "ingredients": [
            {"name": "菠菜", "amount": "120g"},
            {"name": "嫩豆腐", "amount": "180g"},
            {"name": "鸡蛋", "amount": "1个"},
            {"name": "姜片", "amount": "2片"},
        ],
        "steps": [
            "锅中加水和姜片煮开，放入豆腐块煮 3 分钟。",
            "鸡蛋打散后缓慢倒入，形成蛋花。",
            "加入菠菜煮至断生。",
            "最后少量调味即可，适合作为清淡晚餐配汤。",
        ],
        "nutrition": _nutrition(148, 12.7, 8.2, 6.9, 2.2, 176, 1.7),
    },
]


__all__ = ["DEFAULT_RECIPES"]
