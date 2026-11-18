# Builds the app's own fonts (public/fonts/*.woff2), cut down to the characters the app shows.
# Full fonts: Google Fonts repository (SIL Open Font License), e.g. github.com/google/fonts/tree/main/ofl.
# Usage: python3 scripts/subset_fonts.py <folder with the .ttf files>
# Needs: pip install fonttools brotli. Run again whenever texts gain new kanji.
import glob, json, os, re, sys
from fontTools import subset

src = sys.argv[1] if len(sys.argv) > 1 else "ttf"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Everything written in the code and data, plus Latin for names and custom notes.
text = ""
for f in glob.glob(f"{root}/src/**/*.ts", recursive=True) + glob.glob(f"{root}/src/**/*.json", recursive=True) + [f"{root}/index.html"]:
    text += open(f, encoding="utf-8").read()
latin = "".join(chr(c) for c in list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)))
punct = "«»…’‘“”—–·•×→←↑↓⌫＋　、。「」『』・ー〜！？（）："
kana = "".join(chr(c) for c in list(range(0x3041, 0x3097)) + list(range(0x30A1, 0x30FD)))
used = set(text) | set(latin) | set(punct) | set(kana)
cjk = {c for c in used if ord(c) >= 0x3000}
all_chars = "".join(sorted(c for c in used if c.isprintable() or c == " "))

FONTS = [  # (file, output, characters)
    ("ShipporiMinchoB1-Medium.ttf", "shippori-mincho-b1-500", all_chars),
    ("ZenKakuGothicNew-Regular.ttf", "zen-kaku-gothic-new-400", all_chars),
    ("ZenKakuGothicNew-Medium.ttf", "zen-kaku-gothic-new-500", all_chars),
    ("KleeOne-SemiBold.ttf", "klee-one-600", all_chars),
    # Only for the « same sign in five typefaces » tiles: kana alone.
    ("ShipporiMincho-Medium.ttf", "shippori-mincho-500", kana),
    ("YujiSyuku-Regular.ttf", "yuji-syuku-400", kana),
    ("ZenMaruGothic-Medium.ttf", "zen-maru-gothic-500", kana),
]
os.makedirs(f"{root}/public/fonts", exist_ok=True)
for ttf, out, chars in FONTS:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "palt", "vert", "liga"]
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ["*"]
    font = subset.load_font(f"{src}/{ttf}", opts)
    s = subset.Subsetter(opts)
    s.populate(text=chars)
    s.subset(font)
    dest = f"{root}/public/fonts/{out}.woff2"
    subset.save_font(font, dest, opts)
    print(f"{out}: {os.path.getsize(dest) // 1024} KB")
# The list of kept characters, checked by tests/fonts.test.ts against the sources.
open(f"{root}/src/data/font-chars.txt", "w", encoding="utf-8").write("".join(sorted(cjk)))
print(len(cjk), "Japanese characters kept")
