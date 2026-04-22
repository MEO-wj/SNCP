from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageColor, ImageDraw


SIZE = 1024


def rgb(value: str) -> tuple[int, int, int]:
    return ImageColor.getrgb(value)


def rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    return (*rgb(value), alpha)


def lerp_channel(start: int, end: int, t: float) -> int:
    return round(start + (end - start) * t)


def blend(start: str | tuple[int, int, int], end: str | tuple[int, int, int], t: float) -> tuple[int, int, int]:
    left = rgb(start) if isinstance(start, str) else start
    right = rgb(end) if isinstance(end, str) else end
    return tuple(lerp_channel(left[i], right[i], t) for i in range(3))


def diagonal_gradient(size: tuple[int, int], start: str, end: str) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size)
    pixels = image.load()
    span = max((width - 1) + (height - 1), 1)
    start_rgb = rgb(start)
    end_rgb = rgb(end)

    for y in range(height):
        for x in range(width):
            t = (x + y) / span
            pixels[x, y] = (
                lerp_channel(start_rgb[0], end_rgb[0], t),
                lerp_channel(start_rgb[1], end_rgb[1], t),
                lerp_channel(start_rgb[2], end_rgb[2], t),
                255,
            )

    return image


def vertical_gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(height - 1, 1)
        draw.line((0, y, width, y), fill=(*blend(top, bottom, t), 255))
    return image


def ellipse_mask(size: tuple[int, int], inset: int = 0) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse((inset, inset, width - inset, height - inset), fill=255)
    return mask


def cubic_curve_points(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    steps: int = 32,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        inverse = 1 - t
        x = (
            (inverse ** 3) * p0[0]
            + 3 * (inverse ** 2) * t * p1[0]
            + 3 * inverse * (t ** 2) * p2[0]
            + (t ** 3) * p3[0]
        )
        y = (
            (inverse ** 3) * p0[1]
            + 3 * (inverse ** 2) * t * p1[1]
            + 3 * inverse * (t ** 2) * p2[1]
            + (t ** 3) * p3[1]
        )
        points.append((x, y))
    return points


def petal_points(
    box: tuple[float, float, float, float],
    lean: float = 0.0,
    steps: int = 24,
) -> list[tuple[float, float]]:
    left, top, right, bottom = box
    width = right - left
    height = bottom - top
    top_point = (left + width * (0.50 + lean * 0.08), top)
    bottom_point = (left + width * (0.48 - lean * 0.06), bottom)
    right_side = cubic_curve_points(
        top_point,
        (left + width * 0.96, top + height * 0.18),
        (left + width * 0.90, top + height * 0.76),
        bottom_point,
        steps=steps,
    )
    left_side = cubic_curve_points(
        bottom_point,
        (left + width * 0.12, top + height * 0.88),
        (left + width * 0.02, top + height * 0.28),
        top_point,
        steps=steps,
    )
    return right_side + left_side


def leaf_image(size: tuple[int, int], start: str, end: str) -> Image.Image:
    width, height = size
    base = vertical_gradient(size, start, end)
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    top = (width * 0.56, height * 0.02)
    bottom = (width * 0.38, height * 0.98)
    right_side = cubic_curve_points(
        top,
        (width * 0.90, height * 0.10),
        (width * 0.92, height * 0.68),
        bottom,
        steps=40,
    )
    left_side = cubic_curve_points(
        bottom,
        (width * 0.10, height * 0.86),
        (width * 0.02, height * 0.24),
        top,
        steps=40,
    )
    draw.polygon(right_side + left_side, fill=255)

    leaf = Image.new("RGBA", size, (0, 0, 0, 0))
    leaf.paste(base, (0, 0), mask)

    draw = ImageDraw.Draw(leaf)
    main_vein = cubic_curve_points(
        (width * 0.22, height * 0.84),
        (width * 0.38, height * 0.62),
        (width * 0.56, height * 0.38),
        (width * 0.74, height * 0.14),
        steps=20,
    )
    draw.line(main_vein, fill=rgba("#F3F9E1", 214), width=7)
    draw.line(
        [(width * 0.42, height * 0.54), (width * 0.26, height * 0.42)],
        fill=rgba("#F3F9E1", 126),
        width=3,
    )
    draw.line(
        [(width * 0.55, height * 0.39), (width * 0.72, height * 0.48)],
        fill=rgba("#F3F9E1", 126),
        width=3,
    )
    return leaf


def translate_points(points: list[tuple[float, float]], dx: float = 0.0, dy: float = 0.0) -> list[tuple[float, float]]:
    return [(x + dx, y + dy) for x, y in points]


def build_background() -> Image.Image:
    background = diagonal_gradient((SIZE, SIZE), "#FFFAF4", "#F5E8D3")
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(halo)
    draw.ellipse((118, 118, 906, 906), fill=rgba("#FFFFFF", 56))
    draw.ellipse((184, 184, 840, 840), fill=rgba("#FFF4E6", 42))
    background.alpha_composite(halo)
    return background


def lemon_mask(size: tuple[int, int], inset: int = 0) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    left = inset
    top = inset
    right = width - inset
    bottom = height - inset
    body = lemon_points((left, top, right, bottom))
    ImageDraw.Draw(mask).polygon(body, fill=255)
    return mask


def lemon_points(
    box: tuple[float, float, float, float],
    steps: int = 42,
) -> list[tuple[float, float]]:
    left, top, right, bottom = box
    width = right - left
    height = bottom - top
    left_tip = (left + width * 0.03, top + height * 0.56)
    right_tip = (left + width * 0.97, top + height * 0.48)
    top_curve = cubic_curve_points(
        left_tip,
        (left + width * 0.18, top + height * 0.08),
        (left + width * 0.78, top + height * 0.00),
        right_tip,
        steps=steps,
    )
    bottom_curve = cubic_curve_points(
        right_tip,
        (left + width * 0.82, top + height * 0.98),
        (left + width * 0.20, top + height * 1.02),
        left_tip,
        steps=steps,
    )
    return top_curve + bottom_curve


def render_badge(canvas: Image.Image) -> None:
    badge_size = (646, 522)
    badge_origin = (188, 274)
    badge = diagonal_gradient(badge_size, "#FFF3A8", "#F3C73C")
    canvas.paste(badge, badge_origin, lemon_mask(badge_size, inset=6))

    detail = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(detail)

    outer = translate_points(lemon_points((206, 290, 816, 776)), dx=0, dy=0)
    inner = translate_points(lemon_points((230, 314, 792, 752)), dx=0, dy=0)
    upper_glow = cubic_curve_points((272, 434), (378, 304), (618, 284), (738, 392), steps=28)
    lower_glow = cubic_curve_points((298, 650), (430, 706), (588, 700), (708, 638), steps=28)

    draw.line(outer, fill=rgba("#FFF5CF", 150), width=8, joint="curve")
    draw.line(inner, fill=rgba("#FFF9E6", 128), width=6, joint="curve")
    draw.line(upper_glow, fill=rgba("#FFFBEF", 126), width=8)
    draw.line(lower_glow, fill=rgba("#E7BA39", 82), width=6)
    canvas.alpha_composite(detail)


def render_leaf(canvas: Image.Image) -> None:
    stem = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(stem)
    draw.line((382, 304, 334, 272), fill=rgba("#7EA648", 188), width=7)
    canvas.alpha_composite(stem)

    leaf = leaf_image((124, 236), "#B7EA76", "#5DBB59").rotate(-34, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(leaf, dest=(248, 176))


def render_leaf_inside_badge(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.line((344, 430, 386, 396), fill=rgba("#85AA52", 186), width=6)
    canvas.alpha_composite(layer)

    leaf = leaf_image((96, 190), "#BDEB7B", "#62C05A").rotate(-18, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(leaf, dest=(278, 312))


def render_inner_mark(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ink = rgba("#49546D", 236)
    ivory = rgba("#FFF8F0", 248)
    porcelain_shadow = rgba("#F0DDCB", 212)
    porcelain_glow = rgba("#FFFFFF", 112)
    broth = rgba("#ECE7D3", 232)
    broth_detail = rgba("#D3CDB7", 196)
    steam = rgba("#EF9061", 224)
    spoon_fill = rgba("#FFF8EF", 244)

    draw.ellipse((396, 668, 644, 696), fill=rgba("#C96E21", 34))

    spoon_handle = cubic_curve_points(
        (590, 530),
        (604, 500),
        (628, 458),
        (654, 412),
        steps=20,
    )
    draw.line(spoon_handle, fill=ink, width=9)
    draw.line(spoon_handle, fill=rgba("#6B7890", 126), width=3)
    draw.ellipse((560, 520, 598, 552), fill=spoon_fill, outline=ink, width=6)

    draw.rounded_rectangle((344, 528, 410, 558), radius=16, fill=ivory, outline=ink, width=7)
    draw.rounded_rectangle((614, 528, 680, 558), radius=16, fill=ivory, outline=ink, width=7)
    draw.rounded_rectangle((356, 536, 396, 550), radius=10, outline=rgba("#FFF8EF", 172), width=3)
    draw.rounded_rectangle((628, 536, 668, 550), radius=10, outline=rgba("#FFF8EF", 172), width=3)

    body_left = cubic_curve_points((406, 550), (376, 592), (384, 652), (446, 686), steps=22)
    body_bottom = cubic_curve_points((446, 686), (490, 700), (536, 700), (578, 686), steps=16)[1:]
    body_right = cubic_curve_points((578, 686), (640, 652), (648, 592), (618, 550), steps=22)[1:]
    draw.polygon(body_left + body_bottom + body_right + [(406, 550)], fill=ivory)
    draw.pieslice((432, 602, 592, 698), start=10, end=170, fill=porcelain_shadow)
    draw.arc((430, 616, 594, 694), start=18, end=162, fill=rgba("#E5C2A6", 138), width=5)
    draw.arc((420, 570, 544, 672), start=188, end=258, fill=porcelain_glow, width=5)
    draw.line(body_left + body_bottom + body_right, fill=ink, width=8)

    draw.ellipse((390, 494, 634, 570), fill=ivory, outline=ink, width=10)
    draw.arc((404, 508, 620, 560), start=196, end=340, fill=rgba("#FFF6EC", 170), width=4)

    draw.ellipse((408, 510, 616, 550), fill=broth)
    draw.line((438, 544, 472, 548), fill=broth_detail, width=4)
    draw.line((494, 540, 532, 544), fill=broth_detail, width=4)
    draw.line((550, 546, 586, 542), fill=broth_detail, width=4)
    draw.ellipse((408, 510, 616, 550), outline=rgba("#FFF8EF", 146), width=3)

    for steam_path in (
        cubic_curve_points((484, 470), (474, 446), (498, 422), (486, 398), steps=16),
        cubic_curve_points((518, 464), (510, 440), (532, 416), (520, 390), steps=16),
        cubic_curve_points((552, 470), (562, 446), (542, 420), (554, 396), steps=16),
    ):
        draw.line(steam_path, fill=steam, width=8)

    canvas.alpha_composite(layer)


def render_inner_mark_hero(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ink = rgba("#49546D", 236)
    ivory = rgba("#FFF8F0", 248)
    porcelain_shadow = rgba("#EED9C2", 218)
    porcelain_base = rgba("#EAC79C", 198)
    porcelain_glow = rgba("#FFFFFF", 118)
    broth = rgba("#ECE7D3", 234)
    broth_detail = rgba("#D0CAB5", 194)
    steam = rgba("#EF9061", 220)
    spoon_fill = rgba("#FFF8EF", 244)

    draw.ellipse((334, 726, 700, 762), fill=rgba("#C18B3C", 34))

    spoon_handle = cubic_curve_points(
        (612, 556),
        (638, 510),
        (668, 462),
        (698, 408),
        steps=24,
    )
    draw.line(spoon_handle, fill=ink, width=11)
    draw.line(spoon_handle, fill=rgba("#6A7890", 118), width=4)
    draw.ellipse((574, 540, 620, 580), fill=spoon_fill, outline=ink, width=7)

    draw.rounded_rectangle((290, 548, 392, 588), radius=20, fill=ivory, outline=ink, width=8)
    draw.rounded_rectangle((634, 548, 736, 588), radius=20, fill=ivory, outline=ink, width=8)
    draw.rounded_rectangle((304, 558, 376, 578), radius=12, outline=rgba("#FFF8EF", 176), width=4)
    draw.rounded_rectangle((650, 558, 722, 578), radius=12, outline=rgba("#FFF8EF", 176), width=4)

    body_left = cubic_curve_points((370, 584), (326, 632), (330, 710), (422, 758), steps=24)
    body_bottom = cubic_curve_points((422, 758), (496, 786), (586, 782), (644, 742), steps=18)[1:]
    body_right = cubic_curve_points((644, 742), (708, 704), (714, 620), (658, 584), steps=24)[1:]
    draw.polygon(body_left + body_bottom + body_right + [(370, 584)], fill=ivory)
    draw.pieslice((426, 636, 602, 772), start=8, end=170, fill=porcelain_shadow)
    draw.pieslice((438, 710, 592, 790), start=14, end=166, fill=porcelain_base)
    draw.arc((420, 620, 566, 730), start=190, end=258, fill=porcelain_glow, width=6)
    draw.line(body_left + body_bottom + body_right, fill=ink, width=9)

    draw.ellipse((338, 506, 686, 610), fill=ivory, outline=ink, width=12)
    draw.arc((360, 524, 664, 594), start=198, end=338, fill=rgba("#FFF6EC", 168), width=5)

    draw.ellipse((366, 532, 658, 582), fill=broth)
    draw.line((410, 566, 460, 572), fill=broth_detail, width=4)
    draw.line((486, 560, 538, 566), fill=broth_detail, width=4)
    draw.line((562, 570, 612, 562), fill=broth_detail, width=4)
    draw.ellipse((366, 532, 658, 582), outline=rgba("#FFF8EF", 150), width=4)

    for steam_path in (
        cubic_curve_points((474, 486), (460, 454), (490, 426), (474, 394), steps=18),
        cubic_curve_points((520, 478), (508, 446), (538, 416), (524, 382), steps=18),
        cubic_curve_points((566, 486), (580, 454), (552, 424), (568, 392), steps=18),
    ):
        draw.line(steam_path, fill=steam, width=9)

    canvas.alpha_composite(layer)


def lemon_sticker_image(size: tuple[int, int]) -> Image.Image:
    width, height = size
    sticker = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(sticker)

    white_outline = lemon_points((14, 18, width - 14, height - 18))
    lemon_body = lemon_points((28, 30, width - 30, height - 30))
    highlight = cubic_curve_points(
        (width * 0.26, height * 0.48),
        (width * 0.40, height * 0.30),
        (width * 0.63, height * 0.26),
        (width * 0.76, height * 0.38),
        steps=24,
    )

    draw.polygon(white_outline, fill=rgba("#FFFDF7", 244))
    draw.polygon(lemon_body, fill=rgba("#F8DE63", 244), outline=rgba("#E2B92D", 236))
    draw.line(highlight, fill=rgba("#FFF8D6", 156), width=8)
    draw.arc((width * 0.24, height * 0.40, width * 0.68, height * 0.82), start=188, end=332, fill=rgba("#F3C846", 118), width=6)

    leaf = leaf_image((70, 132), "#BDEA79", "#61C058").rotate(-30, resample=Image.Resampling.BICUBIC, expand=True)
    sticker.alpha_composite(leaf, dest=(18, 0))

    stem_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    stem_draw = ImageDraw.Draw(stem_layer)
    stem_draw.line((62, 42, 92, 58), fill=rgba("#7BA64B", 186), width=5)
    sticker.alpha_composite(stem_layer)
    return sticker


def render_inner_mark_sticker(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ink = rgba("#49546D", 236)
    ivory = rgba("#FFF8F0", 248)
    porcelain_shadow = rgba("#EFD9C1", 220)
    porcelain_base = rgba("#E9C89F", 194)
    porcelain_glow = rgba("#FFFFFF", 118)
    broth = rgba("#ECE7D3", 234)
    broth_detail = rgba("#D0CAB5", 194)
    steam = rgba("#EF9061", 220)
    spoon_fill = rgba("#FFF8EF", 244)

    draw.ellipse((240, 796, 796, 834), fill=rgba("#C18B3C", 30))

    spoon_handle = cubic_curve_points(
        (684, 530),
        (714, 480),
        (746, 426),
        (774, 366),
        steps=24,
    )
    draw.line(spoon_handle, fill=ink, width=13)
    draw.line(spoon_handle, fill=rgba("#6A7890", 116), width=4)
    draw.ellipse((640, 514, 692, 558), fill=spoon_fill, outline=ink, width=7)

    draw.rounded_rectangle((150, 516, 316, 572), radius=24, fill=ivory, outline=ink, width=9)
    draw.rounded_rectangle((708, 516, 874, 572), radius=24, fill=ivory, outline=ink, width=9)
    draw.rounded_rectangle((170, 530, 294, 556), radius=14, outline=rgba("#FFF8EF", 172), width=4)
    draw.rounded_rectangle((732, 530, 856, 556), radius=14, outline=rgba("#FFF8EF", 172), width=4)

    body_left = cubic_curve_points((286, 560), (222, 632), (226, 748), (398, 834), steps=28)
    body_bottom = cubic_curve_points((398, 834), (528, 866), (670, 850), (744, 788), steps=22)[1:]
    body_right = cubic_curve_points((744, 788), (816, 728), (812, 610), (726, 560), steps=28)[1:]
    draw.polygon(body_left + body_bottom + body_right + [(286, 560)], fill=ivory)
    draw.pieslice((432, 672, 658, 850), start=10, end=170, fill=porcelain_shadow)
    draw.pieslice((452, 760, 638, 832), start=14, end=166, fill=porcelain_base)
    draw.arc((374, 618, 546, 766), start=190, end=258, fill=porcelain_glow, width=6)
    draw.line(body_left + body_bottom + body_right, fill=ink, width=10)

    draw.ellipse((214, 448, 810, 624), fill=ivory, outline=ink, width=12)
    draw.arc((252, 474, 770, 598), start=198, end=338, fill=rgba("#FFF6EC", 170), width=5)

    draw.ellipse((266, 490, 758, 586), fill=broth)
    draw.line((342, 548, 428, 560), fill=broth_detail, width=5)
    draw.line((476, 540, 562, 552), fill=broth_detail, width=5)
    draw.line((612, 556, 696, 542), fill=broth_detail, width=5)
    draw.ellipse((266, 490, 758, 586), outline=rgba("#FFF8EF", 150), width=4)

    for steam_path in (
        cubic_curve_points((470, 430), (454, 390), (490, 356), (470, 316), steps=18),
        cubic_curve_points((532, 420), (518, 382), (552, 346), (536, 304), steps=18),
        cubic_curve_points((594, 430), (612, 390), (574, 352), (596, 314), steps=18),
    ):
        draw.line(steam_path, fill=steam, width=10)

    sticker_shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sticker_shadow).ellipse((388, 616, 642, 758), fill=rgba("#D8B16A", 28))
    layer.alpha_composite(sticker_shadow)

    sticker = lemon_sticker_image((284, 216)).rotate(-5, resample=Image.Resampling.BICUBIC, expand=True)
    sticker_shadow = Image.new("RGBA", sticker.size, (0, 0, 0, 0))
    ImageDraw.Draw(sticker_shadow).ellipse((18, 26, sticker.size[0] - 18, sticker.size[1] - 10), fill=rgba("#CFB389", 24))
    layer.alpha_composite(sticker_shadow, dest=(360, 576))
    layer.alpha_composite(sticker, dest=(348, 560))

    canvas.alpha_composite(layer)


def create_full_icon() -> Image.Image:
    canvas = build_background()
    render_badge(canvas)
    render_leaf(canvas)
    render_inner_mark(canvas)
    return canvas


def create_foreground_icon() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    render_badge(canvas)
    render_leaf(canvas)
    render_inner_mark(canvas)
    return canvas


def create_pot_sticker_icon() -> Image.Image:
    canvas = build_background()
    render_inner_mark_sticker(canvas)
    return canvas


def create_pot_sticker_foreground_icon() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    render_inner_mark_sticker(canvas)
    return canvas


def export_assets(root: Path) -> None:
    assets_dir = root / "assets" / "images"
    app_icon = create_full_icon().convert("RGB")
    app_icon.save(assets_dir / "icon-pot-hero.png", format="PNG")


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    export_assets(project_root)
