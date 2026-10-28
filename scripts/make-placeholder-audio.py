"""Временные беззвучные аудиофайлы для квеста kronstadt-walk.

Пока нет настоящей озвучки, плееру и смене картинок нужны файлы. Скрипт проходит
по сценариям в src/quests/kronstadt-walk/content/*.json и для каждого куска аудио
делает беззвучный MP3 с примерной длительностью по объёму текста.

Имена файлов = ID кусков (st1-01.mp3 и т. д.), как в ТЗ, — настоящая озвучка
потом просто заменит их файлами с теми же именами.

Существующие файлы не трогаем (чтобы не затереть настоящую озвучку).
Пересоздать заглушки: python3 scripts/make-placeholder-audio.py --force

Нужен ffmpeg.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/quests/kronstadt-walk/content"
PUBLIC = ROOT / "public/quests/kronstadt-walk"

# Примерная скорость спокойной озвучки: символов в секунду.
CHARS_PER_SECOND = 14


def clips(station: dict):
    for step in station["steps"]:
        yield from step.get("clips", [])
        if "afterAnswer" in step:
            yield step["afterAnswer"]


def main() -> None:
    force = "--force" in sys.argv
    for path in sorted(CONTENT.glob("*.json")):
        for clip in clips(json.loads(path.read_text(encoding="utf-8"))):
            out = PUBLIC / clip["file"]
            if out.exists() and not force:
                print(f"{out.name}: уже есть, пропускаю")
                continue
            chars = sum(len(p) for p in clip["paragraphs"])
            seconds = max(3, round(chars / CHARS_PER_SECOND))
            out.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                 "-i", "anullsrc=r=22050:cl=mono", "-t", str(seconds),
                 "-c:a", "libmp3lame", "-b:a", "32k", str(out)],
                check=True,
            )
            print(f"{out.name}: {seconds} с (заглушка)")


if __name__ == "__main__":
    main()
