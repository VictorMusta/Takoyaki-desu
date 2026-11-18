# Regenerates src/data/kana.json from KanjiVG SVG files (CC BY-SA 3.0, Ulrich Apel).
# Usage: python3 scripts/extract_kana.py <folder with KanjiVG 0XXXX.svg files>
import re, json, sys

H = [  # hiragana lines: (line id, [(sign, romaji)])
    ("a", "あa いi うu えe おo"), ("ka", "かka きki くku けke こko"), ("sa", "さsa しshi すsu せse そso"),
    ("ta", "たta ちchi つtsu てte とto"), ("na", "なna にni ぬnu ねne のno"), ("ha", "はha ひhi ふfu へhe ほho"),
    ("ma", "まma みmi むmu めme もmo"), ("ya", "やya ゆyu よyo"), ("ra", "らra りri るru れre ろro"),
    ("wa", "わwa をwo んn"),
    ("ga", "がga ぎgi ぐgu げge ごgo"), ("za", "ざza じji ずzu ぜze ぞzo"), ("da", "だda ぢdi づdu でde どdo"),
    ("ba", "ばba びbi ぶbu べbe ぼbo"), ("pa", "ぱpa ぴpi ぷpu ぺpe ぽpo"),
    ("petits", "ゃya ゅyu ょyo っtsu"),
]
KATA = [  # katakana lines, same order; ids in capitals
    ("A", "アa イi ウu エe オo"), ("KA", "カka キki クku ケke コko"), ("SA", "サsa シshi スsu セse ソso"),
    ("TA", "タta チchi ツtsu テte トto"), ("NA", "ナna ニni ヌnu ネne ノno"), ("HA", "ハha ヒhi フfu ヘhe ホho"),
    ("MA", "マma ミmi ムmu メme モmo"), ("YA", "ヤya ユyu ヨyo"), ("RA", "ラra リri ルru レre ロro"),
    ("WA", "ワwa ヲwo ンn"),
    ("GA", "ガga ギgi グgu ゲge ゴgo"), ("ZA", "ザza ジji ズzu ゼze ゾzo"), ("DA", "ダda ヂdi ヅdu デde ドdo"),
    ("BA", "バba ビbi ブbu ベbe ボbo"), ("PA", "パpa ピpi プpu ペpe ポpo"),
    ("PETITS", "ャya ュyu ョyo ッtsu ー-"),
]
H = H + KATA
SMALL = set("ゃゅょっャュョッ")

def strokes(folder, ch):
    cp = f"{ord(ch):05x}"
    s = open(f"{folder}/{cp}.svg", encoding="utf-8").read()
    paths = sorted(re.findall(r'<path id="kvg:' + cp + r'-s(\d+)"[^>]*\sd="([^"]+)"', s), key=lambda x: int(x[0]))
    if not paths:
        sys.exit(f"no strokes for {ch}")
    return [p[1] for p in paths]

folder = sys.argv[1] if len(sys.argv) > 1 else "svg"
out = []
for ln, items in H:
    for it in items.split():
        ch, r = it[0], it[1:]
        e = {"k": ch, "r": r, "l": ln, "s": strokes(folder, ch)}
        if ch in SMALL:
            e["small"] = True
        out.append(e)
json.dump(out, open("src/data/kana.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "signs,", sum(len(x["s"]) for x in out), "strokes")
