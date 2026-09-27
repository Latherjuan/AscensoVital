"""Procesa los PNG de assets_optimizados_snes_rpg para el prototipo.

Las imagenes vienen opacas con el "damero" de transparencia pintado encima y la
marca de agua de Gemini abajo a la derecha. Este script:
  1. Detecta los dos tonos del damero de cada hoja.
  2. Elimina el fondo (regiones grises conectadas al borde o huecos con damero).
  3. Recorta cada sprite de su celda y lo guarda recortado al contenido.
  4. Recorta y convierte los fondos a WebP.

Uso:  python tools/process_assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets_optimizados_snes_rpg"
OUT = ROOT / "ascension-vital" / "assets"

WATERMARK = (850, 985, 1024, 1024)  # x0, y0, x1, y1 de "Gemini Notebook"


def checker_shades(rgb: np.ndarray) -> list[float]:
    """Devuelve los dos niveles de gris del damero leyendo el borde de la imagen."""
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-40:-30].reshape(-1, 3),
                             rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    gray = border.max(1) - border.min(1) <= 6
    v = border[gray].mean(1)
    hist, edges = np.histogram(v, bins=64, range=(0, 256))
    peaks = np.argsort(hist)[::-1]
    first = peaks[0]
    second = next(p for p in peaks[1:] if abs(p - first) > 4)
    return sorted([(edges[first] + edges[first + 1]) / 2, (edges[second] + edges[second + 1]) / 2])


def remove_background(img: Image.Image, tol: int = 14, sat: int = 7, shade_range=None) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    rgb = rgba[..., :3].astype(np.int16)
    x0, y0, x1, y1 = WATERMARK
    shades = checker_shades(rgb) if shade_range is None else list(shade_range)
    v = rgb.mean(2)
    grayish = (rgb.max(2) - rgb.min(2)) <= sat
    near = [grayish & (np.abs(v - s) <= tol) for s in shades]
    # las lineas entre casillas son mezclas de ambos tonos: todo el rango intermedio es fondo
    mask = grayish & (v >= shades[0] - tol) & (v <= shades[1] + tol)
    mask[y0:y1, x0:x1] = True  # la marca de agua siempre es fondo

    labels, n = ndimage.label(mask)
    border_ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    border_ids.discard(0)
    remove = np.isin(labels, list(border_ids))
    # huecos internos: componentes grandes que contienen ambos tonos del damero
    sizes = ndimage.sum(np.ones_like(labels), labels, range(n + 1))
    a = ndimage.sum(near[0], labels, range(n + 1))
    b = ndimage.sum(near[1], labels, range(n + 1))
    holes = [i for i in range(1, n + 1) if i not in border_ids and sizes[i] > 150
             and a[i] > 0.2 * sizes[i] and b[i] > 0.2 * sizes[i]]
    if holes:
        remove |= np.isin(labels, holes)
    # suaviza el borde: quita un pixel de halo claro del damero pegado al sprite
    halo = ndimage.binary_dilation(remove) & grayish & (np.abs(v - shades[1]) <= tol + 10)
    remove |= halo
    rgba[remove, 3] = 0
    return Image.fromarray(rgba)


def trim(img: Image.Image, min_area: int = 40, pad: int = 2) -> Image.Image:
    """Recorta al contenido, ignorando motas sueltas pequenas."""
    alpha = np.array(img)[..., 3] > 0
    labels, n = ndimage.label(alpha)
    if n == 0:
        return img
    sizes = ndimage.sum(alpha, labels, range(n + 1))
    keep = np.isin(labels, [i for i in range(1, n + 1) if sizes[i] >= min_area])
    arr = np.array(img)
    arr[~keep, 3] = 0
    ys, xs = np.where(keep)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + pad + 1, img.width), min(ys.max() + pad + 1, img.height))
    return Image.fromarray(arr).crop(box)


def save_cells(clean: Image.Image, cells: dict[str, tuple], folder: str, scale: float = 1.0):
    (OUT / folder).mkdir(parents=True, exist_ok=True)
    for name, box in cells.items():
        sprite = trim(clean.crop(box))
        if scale != 1.0:
            sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.LANCZOS)
        sprite.save(OUT / folder / f"{name}.png", optimize=True)
        print(f"  {folder}/{name}.png {sprite.size}")


def grid(rows: dict[str, tuple], cols: list[tuple], names) -> dict[str, tuple]:
    cells = {}
    for (row, (ya, yb)) in rows.items():
        for i, (xa, xb) in enumerate(cols):
            cells[names(row, i)] = (xa, ya, xb, yb)
    return cells


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print("Equipamiento")
    eq = remove_background(Image.open(SRC / "progression_equipment_sheet.png"))
    rows = {"armor": (48, 175), "boots": (222, 338), "bag": (385, 502), "shield": (548, 670),
            "helm": (722, 822), "weapon": (872, 990)}
    cols = [(60, 250), (300, 510), (540, 770), (790, 1015)]
    save_cells(eq, grid(rows, cols, lambda r, i: f"{r}_t{i + 1}"), "equipment", 0.5)

    print("Jefes")
    boss = remove_background(Image.open(SRC / "bosses_spritesheet.png"))
    rows = {"titan": (55, 295), "dragon": (405, 645), "wraith": (735, 1000)}
    cols = [(0, 215), (215, 420), (420, 625), (625, 830), (830, 1024)]
    save_cells(boss, grid(rows, cols, lambda r, i: f"{r}_{i}"), "bosses")

    print("Iconos UI")
    ui = remove_background(Image.open(SRC / "ui_lote02_icons.png"))
    pillars = ["fisica", "fisiologica", "social", "autoestima", "consciencia", "prosperidad"]
    pcols = [(45, 200), (205, 358), (362, 515), (520, 672), (678, 830), (835, 990)]
    cells = {f"pillar_{p}": (xa, 25, xb, 310) for p, (xa, xb) in zip(pillars, pcols)}
    cells.update({
        "lotus": (40, 345, 250, 495), "lotus_open": (50, 520, 245, 685),
        "shield_recharge": (275, 390, 505, 615),
        "chest_closed": (555, 350, 745, 505), "chest_cracked": (765, 340, 975, 505),
        "chest_gold": (555, 525, 750, 715), "chest_empty": (780, 530, 980, 715),
    })
    save_cells(ui, cells, "ui", 0.5)

    print("Venus")
    venus = trim(remove_background(Image.open(SRC / "venus-avatar-portrait-v2.png"), sat=5, shade_range=(196, 250)))
    venus.resize((venus.width // 2, venus.height // 2), Image.LANCZOS).save(OUT / "ui" / "venus.png", optimize=True)

    print("Dialogo")
    dialog = Image.open(SRC / "dialog_box_snes.png").convert("RGBA").crop((128, 306, 897, 712))
    dialog.save(OUT / "ui" / "dialog_box.png", optimize=True)

    print("Fondos")
    (OUT / "bg").mkdir(parents=True, exist_ok=True)
    backgrounds = {
        "sanctuary": ("bg_sanctuary.png", (0, 86, 1024, 846)),
        "battle": ("bg_battle_stage.png", (0, 0, 1024, 980)),
        "shrine": ("bg_spiritual_shrine.png", (0, 0, 1024, 980)),
        "kitchen": ("bg-kitchen.png", (0, 0, 1024, 980)),
    }
    for name, (file, box) in backgrounds.items():
        Image.open(SRC / file).convert("RGB").crop(box).save(OUT / "bg" / f"{name}.webp", quality=88)
        print(f"  bg/{name}.webp")


if __name__ == "__main__":
    main()
