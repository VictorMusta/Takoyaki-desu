# Regenerates src/data/kana.json from KanjiVG SVG files.
# Usage: python3 scripts/extract_kana.py <folder with KanjiVG 0XXXX.svg files>
import re, json, glob, sys
romaji = {"3042":"a","3044":"i","3046":"u","3048":"e","304a":"o","304b":"ka","304d":"ki","304f":"ku","3051":"ke","3053":"ko","3055":"sa","3057":"shi","3059":"su","305b":"se","305d":"so","305f":"ta","3061":"chi","3064":"tsu","3066":"te","3068":"to","306a":"na","306b":"ni","306c":"nu","306d":"ne","306e":"no","306f":"ha","3072":"hi","3075":"fu","3078":"he","307b":"ho","307e":"ma","307f":"mi","3080":"mu","3081":"me","3082":"mo","3084":"ya","3086":"yu","3088":"yo","3089":"ra","308a":"ri","308b":"ru","308c":"re","308d":"ro","308f":"wa","3092":"wo","3093":"n"}
lines = [("a",["3042","3044","3046","3048","304a"]),("ka",["304b","304d","304f","3051","3053"]),("sa",["3055","3057","3059","305b","305d"]),("ta",["305f","3061","3064","3066","3068"]),("na",["306a","306b","306c","306d","306e"]),("ha",["306f","3072","3075","3078","307b"]),("ma",["307e","307f","3080","3081","3082"]),("ya",["3084","3086","3088"]),("ra",["3089","308a","308b","308c","308d"]),("wa",["308f","3092","3093"])]
out=[]
for ln, cps in lines:
    for cp in cps:
        s=open(f"{sys.argv[1] if len(sys.argv)>1 else 'svg'}/0{cp}.svg",encoding="utf-8").read()
        paths=re.findall(r'<path id="kvg:0'+cp+r'-s(\d+)"[^>]*\sd="([^"]+)"',s)
        paths=sorted(paths,key=lambda x:int(x[0]))
        if not paths: print("NO PATHS",cp); sys.exit(1)
        out.append({"k":chr(int(cp,16)),"r":romaji[cp],"l":ln,"s":[p[1] for p in paths]})
json.dump(out,open("src/data/kana.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(len(out), sum(len(x["s"]) for x in out))
print([ (x["k"],len(x["s"])) for x in out])
