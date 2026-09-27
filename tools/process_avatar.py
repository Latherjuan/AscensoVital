"""Procesa las capas del avatar HD (assets_avatar_hd_completo) para el juego.

Cada imagen de Gemini llega con fondos distintos (magenta, gris, damero, transparencia),
a veces con texto incrustado, y la mayoria como objeto suelto (no alineado al maniqui).
Este script:
  1. Quita el fondo (color de borde dominante + damero) y los textos sueltos bajo el objeto.
  2. Ajusta cada pieza suelta a su ancla del maniqui (cabeza, torso, pies, manos).
  3. Rasteriza todas las capas a la misma rejilla logica (SIZE x SIZE) y las guarda alineadas.
  4. Escribe manifest.json con orden de capas y tipo de tinte.

Uso:  python tools/process_avatar.py [--size 100] [--preview]
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets_avatar_hd_completo"
# Ronda 2: piezas dibujadas sobre la silueta (Metodo A). Si existen, reemplazan a las de SRC y se usan alineadas.
SRC2 = ROOT / "assets_avatar_ronda2"
OUT = ROOT / "ascension-vital" / "assets" / "avatar"
FRAME = 1024  # coordenadas del maniqui

# Anclas medidas sobre body_base.png (coordenadas 1024)
HEAD = dict(x0=348, x1=675, top=112, eyes=330, chin=450)
HEAD_W = HEAD["x1"] - HEAD["x0"]
HEAD_CX = (HEAD["x0"] + HEAD["x1"]) / 2
TORSO = dict(x0=378, x1=645, neck=462, waist=690)
FEET = dict(x0=358, x1=665, bottom=975)
FIST_L = (318, 700)  # puno a la izquierda de la imagen (escudo)
FEET_L = (358, 482)  # pie izquierdo (en la imagen): x0, x1 a la altura del tobillo
FEET_R = (542, 666)
FIST_R = (706, 700)  # puno a la derecha de la imagen (arma)

# Como ubicar cada pieza suelta: ancho objetivo, punto de anclaje y alineacion.
#   width: ancho final en px (coordenadas 1024)       height: alternativa al ancho
#   x/y + align: 'top' | 'center' | 'bottom'          mirror: voltear horizontal
FIT = {
    "hair_front_1": dict(width=HEAD_W * 1.22, x=HEAD_CX, y=HEAD["top"] - 45, align="top"),
    "hair_front_2": dict(width=HEAD_W * 1.25, x=HEAD_CX, y=HEAD["top"] - 30, align="top"),
    "hair_front_4": dict(width=HEAD_W * 1.3, x=HEAD_CX + 10, y=HEAD["top"] - 40, align="top"),
    "hair_front_5": dict(width=HEAD_W * 1.2, x=HEAD_CX, y=HEAD["top"] - 30, align="top"),
    "hair_front_6": dict(width=HEAD_W * 1.25, x=HEAD_CX, y=HEAD["top"] - 30, align="top"),
    "hair_front_7": dict(width=HEAD_W * 1.12, x=HEAD_CX, y=HEAD["top"] - 30, align="top"),
    "hair_front_7_big": dict(width=HEAD_W * 1.5, x=HEAD_CX, y=HEAD["top"] - 75, align="top", src="hair_front_7"),
    "hair_front_8": dict(width=HEAD_W * 1.2, x=HEAD_CX, y=HEAD["top"] - 30, align="top"),
    "hair_back_2": dict(width=HEAD_W * 1.3, x=HEAD_CX, y=HEAD["top"] - 20, align="top"),
    "hair_back_4": dict(width=HEAD_W * 1.25, x=HEAD_CX + 20, y=HEAD["top"] - 30, align="top"),
    "hair_back_6": dict(width=HEAD_W * 1.4, x=HEAD_CX, y=HEAD["top"] - 20, align="top"),
    "hair_back_7": dict(width=HEAD_W * 1.38, x=HEAD_CX, y=HEAD["top"] - 50, align="top"),
    "face_beard": dict(width=HEAD_W * 0.98, x=HEAD_CX, y=318, align="top"),
    "face_mustache": dict(width=HEAD_W * 0.5, x=HEAD_CX, y=392, align="center"),
    "face_glasses": dict(width=HEAD_W * 0.98, x=HEAD_CX, y=HEAD["eyes"], align="center"),
    "face_freckles": dict(width=HEAD_W * 0.62, x=HEAD_CX, y=372, align="center"),
    "helm_t1": dict(width=HEAD_W * 1.08, x=HEAD_CX, y=205, align="center"),
    "helm_t2": dict(width=HEAD_W * 1.08, x=HEAD_CX, y=222, align="center", split_ring=True),
    "helm_t3": dict(width=HEAD_W * 1.18, x=HEAD_CX, y=HEAD["top"] - 45, align="top"),
    "helm_t4": dict(width=HEAD_W * 0.9, x=HEAD_CX, y=HEAD["top"] + 135, align="bottom"),
    "armor_t2": dict(width=(TORSO["x1"] - TORSO["x0"]) * 1.3, x=512, y=TORSO["neck"] - 15, align="top"),
    "armor_t3": dict(width=(TORSO["x1"] - TORSO["x0"]) * 1.32, x=512, y=TORSO["neck"] - 25, align="top"),
    "armor_t4": dict(width=(TORSO["x1"] - TORSO["x0"]) * 1.05, x=512, y=TORSO["neck"] - 10, align="top"),
    "boots_t1": dict(boots=True, scale=0.95),
    "boots_t2": dict(boots=True, scale=1.12),
    "boots_t3": dict(boots=True, scale=1.0),
    "boots_t4": dict(boots=True, scale=1.2),
    "backpack_t1": dict(width=210, x=720, y=470, align="top"),
    "backpack_t2": dict(width=210, x=720, y=470, align="top"),
    "backpack_t3": dict(width=220, x=720, y=460, align="top"),
    "backpack_t4": dict(width=220, x=720, y=460, align="top"),
    "shield_t1": dict(height=215, x=FIST_L[0] + 8, y=FIST_L[1] - 45, align="center"),
    "shield_t2": dict(height=205, x=FIST_L[0] + 8, y=FIST_L[1] - 45, align="center"),
    "shield_t3": dict(height=215, x=FIST_L[0] + 8, y=FIST_L[1] - 45, align="center"),
    "shield_t4": dict(height=200, x=FIST_L[0] + 8, y=FIST_L[1] - 45, align="center"),
    # armas: se voltean (hoja hacia arriba-derecha) y la empunadura va al puno derecho
    "weapon_t1": dict(height=250, grip=FIST_R, mirror=True),
    "weapon_t2": dict(height=320, grip=FIST_R, mirror=True),
    "weapon_t3": dict(height=380, grip=FIST_R, mirror=True),
    "weapon_t4": dict(height=400, grip=FIST_R, mirror=True),
}
ALIGNED = {"body_base", "tunic_base", "armor_t1"}  # ya vienen en posicion del maniqui

# Tinte en tiempo de ejecucion (el juego aplica el color sobre la escala de grises)
TINT = {
    "hair": [f"hair_front_{i}" for i in range(1, 9)] + [f"hair_back_{i}" for i in (2, 4, 6, 7)] + ["face_beard", "face_mustache"],
    "tunic": ["tunic_base"],
    "linen": ["armor_t1", "helm_t1", "boots_t1", "backpack_t1"],
    "leather": ["armor_t2", "boots_t2", "backpack_t2"],
    "canvas": ["backpack_t3"],
}


# ---------------------------------------------------------------- limpieza
def border_pixels(rgba):
    a = rgba.copy()
    ring = np.zeros(a.shape[:2], bool)
    ring[:10, :] = ring[-10:, :] = ring[:, :10] = ring[:, -10:] = True
    ring[-60:, -220:] = False  # marca de agua
    return a[ring]


def remove_background(img: Image.Image) -> np.ndarray:
    a = np.array(img.convert("RGBA")).astype(np.int16)
    alpha = a[..., 3] > 16
    rgb = a[..., :3]
    border = border_pixels(a)
    opaque_border = border[border[:, 3] > 16][:, :3]
    bg = np.zeros(alpha.shape, bool)
    if len(opaque_border):
        # colores de fondo dominantes del borde (cuantizados)
        q = (opaque_border // 24) * 24
        keys, counts = np.unique(q, axis=0, return_counts=True)
        dominant = keys[counts > 0.04 * counts.sum()] + 12
        for c in dominant:
            bg |= np.abs(rgb - c).max(axis=2) <= 34
    # magenta y damero magenta/gris siempre cuentan como fondo candidato
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = (r > 140) & (b > 110) & (g < 0.62 * np.minimum(r, b)) & (np.abs(r - b) < 90)
    bg |= magenta
    # magenta puro: siempre fondo, aunque quede encerrado (ej. axilas de la tunica)
    pure = (r > 185) & (b > 185) & (g < 90)
    bg |= ~alpha
    # solo lo conectado al borde (o regiones grandes encerradas) es fondo
    labels, n = ndimage.label(bg)
    edge_ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    sizes = ndimage.sum(bg, labels, range(n + 1))
    remove_ids = edge_ids | {i for i in range(1, n + 1) if sizes[i] > 2500}
    remove = np.isin(labels, list(remove_ids))
    remove[-60:, -220:] = True
    remove |= pure
    # halo magenta pegado al borde del objeto
    halo = ndimage.binary_dilation(remove, iterations=3) & magenta
    remove |= halo
    a[remove, 3] = 0
    a[~remove & alpha, 3] = 255
    return a.astype(np.uint8)


def drop_labels(a: np.ndarray) -> np.ndarray:
    """Elimina textos/motas: se queda con el objeto principal y lo que este cerca de el."""
    m = a[..., 3] > 0
    labels, n = ndimage.label(ndimage.binary_dilation(m, iterations=6))
    if n <= 1:
        return a
    sizes = ndimage.sum(m, labels, range(n + 1))
    main = int(np.argmax(sizes[1:]) + 1)
    ys, _ = np.where(labels == main)
    main_bottom = ys.max()
    keep = labels == main
    for i in range(1, n + 1):
        if i == main:
            continue
        yy, xx = np.where(labels == i)
        is_text_below = yy.min() > main_bottom and (yy.max() - yy.min()) < 110
        if sizes[i] > 0.08 * sizes[main] and not is_text_below:
            keep |= labels == i
    a = a.copy()
    a[~keep, 3] = 0
    return a


def trim(a: np.ndarray) -> np.ndarray:
    ys, xs = np.where(a[..., 3] > 0)
    return a[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]


# ---------------------------------------------------------------- arreglos puntuales
def fix_special(name: str, a: np.ndarray) -> np.ndarray:
    rgb = a[..., :3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if name == "boots_t4":  # quitar las piernas color piel que dibujo Gemini
        skin = (r > 170) & (g > 110) & (g < 200) & (b > 100) & (r - b > 25) & (r - g < 90) & (b > g - 40)
        a[skin, 3] = 0
    if name == "boots_t3":  # quitar el pantalon negro sobre las grebas
        dark = (rgb.max(axis=2) < 45)
        top = np.zeros_like(dark)
        top[: int(a.shape[0] * 0.22)] = True
        a[dark & top, 3] = 0
    if name == "face_freckles":  # solo los puntos marrones
        brown = (r > 110) & (r - b > 40) & (g < r - 15)
        a[~brown, 3] = 0
    if name == "backpack_t4":  # quitar la silueta azul marino de la espalda
        navy = (b > r + 25) & (b > g + 10) & (rgb.max(axis=2) < 120)
        a[navy, 3] = 0
    return a


# ---------------------------------------------------------------- ajuste a anclas
def place_boots(piece: np.ndarray, cfg: dict) -> Image.Image:
    """Separa el par de botas y calza cada una en su pie (en vez de pegar el par como un bloque)."""
    a = trim(piece)
    cols = (a[..., 3] > 0).sum(axis=0)
    w = a.shape[1]
    split = int(w * 0.3 + np.argmin(cols[int(w * 0.3): int(w * 0.7)]))
    canvas = Image.new("RGBA", (FRAME, FRAME))
    for part, (x0, x1) in ((a[:, :split], FEET_L), (a[:, split:], FEET_R)):
        im = Image.fromarray(trim(part))
        tw = (x1 - x0) * cfg.get("scale", 1.0)
        im = im.resize((round(tw), round(im.height * tw / im.width)), Image.LANCZOS)
        canvas.alpha_composite(im, (round((x0 + x1) / 2 - im.width / 2), FEET["bottom"] + 3 - im.height))
    return canvas


def split_ring(full: Image.Image):
    """Divide un aro (diadema) en mitad trasera (va detras de la cabeza) y delantera."""
    a = np.array(full)
    ys, _ = np.where(a[..., 3] > 0)
    mid = (ys.min() + ys.max()) // 2
    back, front = a.copy(), a.copy()
    back[mid:, :, 3] = 0
    front[:mid, :, 3] = 0
    return Image.fromarray(back), Image.fromarray(front)


def place(piece: np.ndarray, cfg: dict) -> Image.Image:
    if cfg.get("boots"):
        return place_boots(piece, cfg)
    im = Image.fromarray(trim(piece))
    if cfg.get("mirror"):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if "width" in cfg:
        s = cfg["width"] / im.width
    else:
        s = cfg["height"] / im.height
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (FRAME, FRAME))
    if "grip" in cfg:  # empunadura en la esquina inferior izquierda (tras voltear)
        gx, gy = cfg["grip"]
        x, y = gx - im.width * 0.2, gy - im.height * 0.8
    else:
        x = cfg["x"] - im.width / 2
        y = {"top": cfg["y"], "center": cfg["y"] - im.height / 2, "bottom": cfg["y"] - im.height}[cfg["align"]]
    canvas.alpha_composite(im, (round(x), round(y)))
    return canvas


def rasterize(full: Image.Image, size: int, native: bool) -> Image.Image:
    """Lleva la capa (en coordenadas 1024) a la rejilla logica size x size."""
    if native:
        # muestreo en el centro de cada celda: conserva los pixeles originales sin mezclar
        a = np.array(full)
        idx = ((np.arange(size) + 0.5) * FRAME / size).astype(int)
        out = a[idx][:, idx]
    else:
        out = np.array(full.resize((size, size), Image.BOX))
    out = out.copy()
    out[..., 3] = np.where(out[..., 3] > 100, 255, 0)
    return Image.fromarray(out)


def hands_layer(body_full: np.ndarray) -> Image.Image:
    """Recorta el puno derecho del maniqui para dibujarlo encima del arma."""
    out = np.zeros_like(body_full)
    x, y = FIST_R
    out[y - 50: y + 42, x - 48: x + 40] = body_full[y - 50: y + 42, x - 48: x + 40]
    return Image.fromarray(out)


def pixel_layer(size: int, pixels) -> Image.Image:
    """Capa dibujada directamente en la rejilla logica de 100 (se escala a `size`)."""
    out = np.zeros((size, size, 4), np.uint8)
    k = size / 100
    for x, y, color in pixels:
        out[int(y * k): int((y + 1) * k), int(x * k): int((x + 1) * k)] = (*color, 255)
    return Image.fromarray(out)


# Las imagenes de Gemini para cicatriz y pecas no eran utilizables a esta escala
SCAR = [(57, 30, (120, 30, 40)), (58, 31, (200, 80, 90)), (58, 32, (120, 30, 40)), (59, 33, (200, 80, 90)),
        (59, 34, (120, 30, 40)), (60, 35, (200, 80, 90)), (60, 36, (120, 30, 40)), (61, 37, (200, 80, 90))]
FRECKLES = [(x, y, (150, 85, 55)) for x, y in [(38, 37), (40, 38), (42, 37), (39, 39), (57, 37), (59, 38), (61, 37), (60, 39), (49, 36)]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=100)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    layers = {}
    sources = {f.stem: f for f in SRC.glob("*.png")}
    round2 = {f.stem: f for f in SRC2.glob("*.png")} if SRC2.exists() else {}
    sources.update(round2)
    for name, f in sorted(sources.items()):
        if name in ("plantilla_silueta", "face_scar", "face_freckles", "hair_front_3") or name.endswith("_descartada"):
            continue
        clean = drop_labels(remove_background(Image.open(f)))
        clean = fix_special(name, clean)
        if name in ALIGNED or name in round2:
            full = Image.fromarray(clean)
        elif name in FIT:
            full = place(clean, FIT[name])
        else:
            print(f"  (sin configuracion) {name}")
            continue
        if name in FIT and FIT[name].get("split_ring") and name not in round2:
            back, full = split_ring(full)
            layers[f"{name}_back"] = back
            rasterize(back, args.size, native=False).save(OUT / f"{name}_back.png", optimize=True)
        layers[name] = full
        rasterize(full, args.size, native=name in ALIGNED or name in round2).save(OUT / f"{name}.png", optimize=True)
        print(f"  {name}.png{' (ronda 2)' if name in round2 else ''}")
    # variantes que reutilizan otra imagen fuente con otro ajuste
    for name, cfg in FIT.items():
        if "src" in cfg and (SRC / f"{cfg['src']}.png").exists():
            clean = drop_labels(remove_background(Image.open(SRC / f"{cfg['src']}.png")))
            layers[name] = place(clean, cfg)
            rasterize(layers[name], args.size, native=False).save(OUT / f"{name}.png", optimize=True)
            print(f"  {name}.png (de {cfg['src']})")
    rasterize(hands_layer(np.array(layers["body_base"])), args.size, native=True).save(OUT / "hands_front.png")
    pixel_layer(args.size, SCAR).save(OUT / "face_scar.png")
    pixel_layer(args.size, FRECKLES).save(OUT / "face_freckles.png")
    layers["face_scar"] = layers["face_freckles"] = None
    tint = {n: t for t, names in TINT.items() for n in names}
    manifest = {"size": args.size, "layers": sorted([*layers, "hands_front"]), "tint": tint}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"OK: {len(layers) + 1} capas en {OUT}")


if __name__ == "__main__":
    main()
