#!/usr/bin/env python3
"""怪獸訓練紀錄 — 自動化測試

用法（在 怪獸訓練App 資料夾內）：
    python3 tests/run_tests.py

做法：把 index.html 裡的主程式抽出來，搭配簡易的瀏覽器替身（document / localStorage），
用 macOS 內建的 JavaScriptCore（osascript -l JavaScript）執行 tests/unit_tests.js。
雲端同步測試使用記憶體中的假 Supabase，不會連到真正的資料庫。
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)

STUB = r"""
var __mk=function(){var f=function(){};return new Proxy(f,{
  get:function(t,p){if(p==='forEach')return function(){};if(p===Symbol.toPrimitive)return function(){return ''};
    if(p==='length')return 0;if(p==='then')return undefined;return __mk();},
  apply:function(){return __mk();},set:function(){return true;}});};
var document=__mk();
var window={addEventListener:function(){},MONSTER_CONFIG:{}};
var navigator={};
var localStorage=(function(){var s={};return{getItem:function(k){return k in s?s[k]:null},
  setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]}}})();
var alert=function(){},confirm=function(){return true};
var setTimeout=function(){return 0},clearTimeout=function(){};
var console={log:function(){},warn:function(){},error:function(){}};
"""


def main_script(html):
    scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
    if not scripts:
        sys.exit("找不到 index.html 內的主程式")
    return max(scripts, key=len)


def baked_numbers(html):
    """從原本的 HTML 讀出年度統計卡與長條圖高度，當作回歸測試的標準答案。"""
    years = {}
    for m in re.finditer(r'<div class="vs-yr"[^>]*>(\d{4})</div>(.*?)(?=<div class="vs-card"|</div>\s*</div>\s*</div>\s*</div>)', html, re.S):
        vals = dict(re.findall(r'<span class="vs-lbl">([^<]+)</span><span class="vs-val">([\d,]+)', m.group(2)))
        num = lambda k: int(vals[k].replace(",", ""))
        years[m.group(1)] = {"n": num("訓練次數"), "vol": num("年度總量"), "avg": num("次均量"),
                             "max": num("單次最高"), "min": num("單次最低")}
    bars = {y: int(h) for y, h in re.findall(r'switchToLog\((\d{4})\)"><div class="bn">\d+</div><div class="b" style="height:(\d+)px', html)}
    return {"years": years, "bars": bars}


def static_checks(html, sw):
    """不需執行程式的檢查。"""
    results = []

    def check(name, ok, detail=""):
        results.append({"name": name, "ok": bool(ok), "detail": "" if ok else detail})

    cdn = re.findall(r'<script src="(https://[^"]+)"([^>]*)>', html)
    missing = [u for u, attrs in cdn if "integrity=" not in attrs or "crossorigin=" not in attrs]
    check("外部函式庫都有 SRI 完整性驗證", not missing, "缺少 integrity：" + ", ".join(missing))
    floating = [u for u, _ in cdn if re.search(r"@\d+/", u)]
    check("外部函式庫都釘選確切版本（不用浮動的 @2）", not floating, ", ".join(floating))
    in_sw = [u for u, _ in cdn if u not in sw]
    check("sw.js 快取清單與 index.html 的函式庫網址一致", not in_sw, "sw.js 沒有：" + ", ".join(in_sw))
    check("sw.js 有版本號（改版時會清掉舊快取）", re.search(r"const VERSION = 'v\d+'", sw), "找不到 VERSION")
    return results


def main():
    html = open(os.path.join(APP, "index.html"), encoding="utf-8").read()
    sw = open(os.path.join(APP, "sw.js"), encoding="utf-8").read()
    tests = open(os.path.join(HERE, "unit_tests.js"), encoding="utf-8").read()

    sw_check = "try{new Function(%s);__swOK=true;}catch(e){__swOK=String(e);}" % json.dumps(sw)
    bundle = "\n".join([
        STUB,
        "var __BAKED=%s;" % json.dumps(baked_numbers(html), ensure_ascii=False),
        "var __swOK=false;" + sw_check,
        main_script(html),
        tests.replace("var __R=[];", "var __R=[];__R.push({name:'sw.js 語法正確',ok:__swOK===true,detail:String(__swOK)});", 1),
    ])

    results = static_checks(html, sw)
    with tempfile.TemporaryDirectory() as tmp:
        js = os.path.join(tmp, "bundle.js")
        out = os.path.join(tmp, "results.json")
        open(js, "w", encoding="utf-8").write(bundle)
        env = dict(os.environ, MONSTER_TEST_OUT=out)
        proc = subprocess.run(["osascript", "-l", "JavaScript", js], capture_output=True, text=True, env=env, timeout=120)
        if not os.path.exists(out):
            print("❌ 測試程式沒有跑完")
            print(proc.stdout[-2000:], proc.stderr[-2000:])
            return 1
        results += json.load(open(out, encoding="utf-8"))

    failed = [r for r in results if not r["ok"]]
    for r in results:
        print(("✅ " if r["ok"] else "❌ ") + r["name"] + ("" if r["ok"] else "\n     → " + r["detail"]))
    print("\n共 %d 項，通過 %d，失敗 %d" % (len(results), len(results) - len(failed), len(failed)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
