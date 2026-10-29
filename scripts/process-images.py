"""Обработка картинок пешего квеста kronstadt-walk.

Берёт оригиналы из assets-src/kronstadt-walk/images/ (их не меняет) и делает
готовые WebP в public/quests/kronstadt-walk/images/:

- герои (Федот и Клуша) — вырезаются из фона: прозрачный фон, ширина до 700 px, до ~100 КБ;
- остальное (журнал, грамота, иллюстрации, схемы, фото) — фон не трогаем,
  ширина до 1200 px, качество ~75, до ~250 КБ.

Ещё обновляет:
- src/quests/kronstadt-walk/images.json — список готовых картинок (размеры, коды);
- таблицу «Готовые файлы» в docs/assets-kronstadt-walk.md.

Запуск из корня проекта:
    pip install -r scripts/requirements.txt
    python3 scripts/process-images.py            # все картинки
    python3 scripts/process-images.py fedot-1    # только указанные (по имени готового файла)

Чтобы добавить или заменить картинку: положите исходник в assets-src/kronstadt-walk/images/,
допишите строку в список IMAGES ниже (если картинка новая) и запустите скрипт.
"""

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets-src/kronstadt-walk/images"
OUT_DIR = ROOT / "public/quests/kronstadt-walk/images"
MANIFEST = ROOT / "src/quests/kronstadt-walk/images.json"
DOC = ROOT / "docs/assets-kronstadt-walk.md"
DOC_START = "<!-- готовые-файлы:начало -->"
DOC_END = "<!-- готовые-файлы:конец -->"

HERO = "hero"  # вырезать фон
FLAT = "flat"  # фон не трогать
CUTOUT = "cutout"  # фон уже прозрачный: оставить его, а саму картинку сделать непрозрачной

# (готовое имя без .webp, код из таблицы, ID, исходный файл, тип)
IMAGES = [
    ("fedot-1", "Ф1", "F1", "Ф5 важно интересно.png", HERO),
    ("fedot-1-gazeta", "Ф1г", "F1-gazeta", "Ф1 рассказчик.png", HERO),
    ("fedot-2", "Ф2", "F2", "Ф2 ворчит.png", HERO),
    ("fedot-3", "Ф3", "F3", "Ф3 ностальгия.png", HERO),
    ("fedot-3-serious", "Ф3-серьёзный", "F3-serious", "Ф3 серьезный.png", HERO),
    ("fedot-4", "Ф4", "F4", "Ф4 страница.png", HERO),
    ("klusha-1", "К1", "K1", "К1 веселая.png", HERO),
    ("klusha-1-dreamy", "К1-мечтательная", "K1-dreamy", "К1 мечтательная.png", HERO),
    ("klusha-2", "К2", "K2", "К2 виноватая.png", HERO),
    ("klusha-3", "К3", "K3", "К3 подсказка.png", HERO),
    ("klusha-4", "К4", "K4", "К4 правда или легенда.png", HERO),
    ("klusha-4b", "К4b", "K4b", "K4b правда или легенда.png", HERO),
    ("klusha-5-pie", "К5-пирожок", "K5-pie", "К5 пирожок.png", HERO),
    ("klusha-5-camera", "К5-фотоаппарат", "K5-camera", "К5 фотоаппарат.png", HERO),
    ("klusha-5-album", "К5-альбом", "K5-album", "К5 записки.png", HERO),
    ("klusha-6", "К6", "K6", "К6 указка.png", HERO),
    # Обложку показываем над карточкой — фон вырезаем, как у героев (Саша, 29.10.2026)
    ("journal-1", "Ж1", "J1", "Ж1.png", HERO),
    ("journal-2", "Ж2", "J2", "Ж2 журнал чистый.webp", FLAT),
    ("journal-3", "Ж3", "J3", "Ж3 прогресс.png", FLAT),
    ("gramota", "ГР", "GR", "ГР грамота.png", FLAT),
    ("ill-klusha-svertok", "—", "ill-klusha-svertok", "завязка.png", FLAT),
    ("ill-zaliv-shema", "—", "ill-zaliv-shema", "ст 1 схема.png", FLAT),
    ("ill-srub-v-prorubi", "—", "ill-srub-v-prorubi", "ст 1 кроншлот.png", FLAT),
    ("foto-yakor-sverhu", "—", "foto-yakor-sverhu", "Ст4_якорь_сверху.jpg", FLAT),
    ("ill-hram-sverhu", "—", "ill-hram-sverhu", "ст 5 восход-запад.png", FLAT),
    ("ill-krestovina", "—", "ill-krestovina", "Ст12а_схема_крестовины.png", FLAT),
    ("foto-dok-vnutri", "—", "foto-dok-vnutri", "Ст15_Петровский_док_внутри.jpg", FLAT),
    ("ill-katok", "—", "ill-katok", "Ст16_Каток_на_Итальянском_пруду_Крестьянинов.png", FLAT),
    ("ill-oranienbaum", "—", "ill-oranienbaum", "Ст17_гравюра_Проспект_Ораниенбаума.png", FLAT),
    ("ill-navodnenie-1824", "—", "ill-navodnenie-1824", "ст 18 наводнение.png", FLAT),
    ("ill-futshtok-shema", "—", "ill-futshtok-shema", "Ст19_схема_футштока.png", FLAT),
    ("mini-map", "Мини-карта", "mini-map", "Мини-карта.webp", CUTOUT),
    ("fedot-reference", "запас", "—", "Капитан референс.png", FLAT),
    ("klusha-reference", "запас", "—", "чайка референс.png", FLAT),
]

CUTOUT_WIDTH = 600
HERO_WIDTH = 700
HERO_MAX_KB = 100
FLAT_WIDTH = 1200
FLAT_QUALITY = 75
FLAT_MAX_KB = 250

_session = None


def cut_out(img: Image.Image) -> Image.Image:
    """Вырезает героя с белого фона нейросетью BiRefNet (точнее всего держит
    белые бескозырки, волосы и перья) и убирает белую кайму по краю."""
    global _session
    from rembg import new_session, remove

    if _session is None:
        _session = new_session("birefnet-general-lite")
    rgb = img.convert("RGB")
    alpha = np.asarray(remove(rgb, session=_session))[..., 3].astype(np.float32) / 255
    # Яркие цветные мелочи (лучики лампочки, крошки) нейросеть иногда теряет.
    # Фон белый, поэтому всё заметно цветное точно относится к картинке.
    px = np.asarray(rgb).astype(np.int16)
    colored = (px.max(axis=2) - px.min(axis=2)) > 60
    alpha = np.maximum(alpha, colored.astype(np.float32))
    # Убираем остатки белого фона: полупрозрачные пиксели края «смешаны» с белым,
    # вычитаем белую часть и оставляем только цвет героя.
    color = np.asarray(rgb).astype(np.float32)
    a = np.clip(alpha, 1e-3, 1)[..., None]
    clean = np.clip((color - (1 - a) * 255) / a, 0, 255)
    edge = (alpha > 0.02) & (alpha < 0.98)
    color[edge] = clean[edge]
    alpha[alpha < 0.03] = 0
    out = Image.fromarray(
        np.dstack([color, alpha * 255]).round().astype(np.uint8), "RGBA"
    )
    box = Image.fromarray((alpha > 0.03).astype(np.uint8) * 255).getbbox()
    return out.crop(box) if box else out


def make_opaque(img: Image.Image) -> Image.Image:
    """Картинка уже вырезана, но сама слегка полупрозрачная (альфа ~252):
    делаем её полностью непрозрачной, мягкий край по контуру оставляем."""
    rgba = img.convert("RGBA")
    px = np.asarray(rgba).copy()
    alpha = px[..., 3]
    alpha[alpha >= 200] = 255
    out = Image.fromarray(px, "RGBA")
    box = Image.fromarray((alpha > 8).astype(np.uint8) * 255).getbbox()
    return out.crop(box) if box else out


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    if img.width <= width:
        return img
    height = round(img.height * width / img.width)
    return img.resize((width, height), Image.LANCZOS)


def encode(img: Image.Image, quality: int, max_kb: int) -> tuple[bytes, int]:
    """Сохраняет в WebP; если файл тяжелее max_kb — понижает качество."""
    while True:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6, alpha_quality=90)
        data = buf.getvalue()
        if len(data) <= max_kb * 1024 or quality <= 40:
            return data, quality
        quality -= 5


def process(name: str, src_name: str, kind: str) -> dict:
    src = Image.open(SRC_DIR / src_name)
    if kind == HERO:
        img = resize_to_width(cut_out(src), HERO_WIDTH)
        data, quality = encode(img, 80, HERO_MAX_KB)
    elif kind == CUTOUT:
        img = resize_to_width(make_opaque(src), CUTOUT_WIDTH)
        data, quality = encode(img, 80, HERO_MAX_KB)
    else:
        img = resize_to_width(src.convert("RGB"), FLAT_WIDTH)
        data, quality = encode(img, FLAT_QUALITY, FLAT_MAX_KB)
    (OUT_DIR / f"{name}.webp").write_bytes(data)
    return {"width": img.width, "height": img.height, "kb": round(len(data) / 1024), "quality": quality}


def update_doc(rows: list[dict]) -> None:
    lines = [
        DOC_START,
        "",
        "Таблицу ниже обновляет `scripts/process-images.py` — руками не править.",
        "",
        "| Код | ID | Исходный файл | Готовый файл | Размер, px | Вес, КБ |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        lines.append(
            f"| {r['code']} | `{r['id']}` | `{r['source']}` | `{r['file']}` | {r['width']} × {r['height']} | {r['kb']} |"
        )
    lines += ["", DOC_END]
    text = DOC.read_text(encoding="utf-8")
    if DOC_START in text:
        head, rest = text.split(DOC_START, 1)
        tail = rest.split(DOC_END, 1)[1]
        text = head + "\n".join(lines) + tail
    else:
        text = text.rstrip() + "\n\n## Готовые файлы\n\n" + "\n".join(lines) + "\n"
    DOC.write_text(text, encoding="utf-8")


def main() -> None:
    only = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    old = {r["file"]: r for r in json.loads(MANIFEST.read_text())} if MANIFEST.exists() else {}
    rows = []
    for name, code, image_id, src_name, kind in IMAGES:
        file = f"{name}.webp"
        if only and name not in only and file in old:
            rows.append(old[file])
            continue
        info = process(name, src_name, kind)
        print(f"{file:32} {info['width']:>4} × {info['height']:<4} {info['kb']:>4} КБ  q{info['quality']}")
        rows.append(
            {"file": file, "code": code, "id": image_id, "source": src_name, "kind": kind,
             "width": info["width"], "height": info["height"], "kb": info["kb"]}
        )
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_doc(rows)
    print(f"Готово, картинок: {len(rows)}")


if __name__ == "__main__":
    main()
