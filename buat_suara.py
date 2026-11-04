import json
import subprocess

with open("narasi.json", encoding="utf-8") as f:
    daftar = json.load(f)

for i, teks in enumerate(daftar, start=1):
    subprocess.run(
        [
            "edge-tts",
            "--voice", "id-ID-ArdiNeural",
            "--text", teks,
            "--write-media", f"public/narasi{i}.mp3",
        ],
        check=True,
    )