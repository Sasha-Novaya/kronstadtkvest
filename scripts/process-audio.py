"""Обработка озвучки квеста kronstadt-walk.

Берёт оригиналы из assets-src/kronstadt-walk/audio/ (их не меняет) и делает
файлы для сайта в public/quests/kronstadt-walk/audio/ по правилам ТЗ станций:
MP3, моно, 96 кбит/с (ТЗ: 64–96), без тишины в начале и в конце, громкость выровнена
у всех кусков (−16 LUFS). Имя файла = ID куска (st1-01.mp3 …) — оно же в сценарии,
поэтому настоящая озвучка просто заменяет временную беззвучную.
Склеенные файлы (intro-01-13, st1-01-02) не режем: картинки меняются по меткам
времени в сценарии.

Запуск из корня проекта (нужен ffmpeg):
    python3 scripts/process-audio.py            # все файлы
    python3 scripts/process-audio.py st2-01     # только указанные
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets-src/kronstadt-walk/audio"
OUT_DIR = ROOT / "public/quests/kronstadt-walk/audio"
SOURCE_TYPES = {".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"}
# Если имя исходника отличается от ID куска в сценарии.
RENAME = {"intro_01-13": "intro-01-13"}

# Тишина тише −45 дБ дольше 0,15 с в начале и в конце обрезается.
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15"
FILTER = f"{TRIM},areverse,{TRIM},areverse,loudnorm=I=-16:TP=-1.5:LRA=11"


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    only = set(sys.argv[1:])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in SRC_DIR.iterdir() if p.suffix.lower() in SOURCE_TYPES)
    for src in sources:
        name = RENAME.get(src.stem, src.stem)
        if only and name not in only:
            continue
        out = OUT_DIR / f"{name}.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af", FILTER,
             "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", str(out)],
            check=True,
        )
        print(f"{out.name}: {duration(src):.1f} с → {duration(out):.1f} с, {out.stat().st_size // 1024} КБ")


if __name__ == "__main__":
    main()
