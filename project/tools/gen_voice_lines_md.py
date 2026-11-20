"""
Write docs/ENGINEER_VOICE_LINES.md: every line the race engineer can say, where it comes from
and when it is used. Generated from the sources so it never drifts:

  backend/data/voice/manifest.json       fixed radio clips
  backend/data/voice/modular_rules.json  "prefix + number + suffix" radio templates
  backend/state_mgmt/engineer_brain.py   setup advice and Q&A answers
  backend/state_mgmt/manager.py          which clips the live triggers actually emit

Run after changing any of them:  python tools/gen_voice_lines_md.py
"""
import json
import os
import re
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
VOICE = os.path.join(BACKEND, "data", "voice")
OUT = os.path.join(ROOT, "docs", "ENGINEER_VOICE_LINES.md")
sys.path.insert(0, BACKEND)
from state_mgmt import engineer_brain as brain  # noqa: E402


def cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def count_mp3(folder):
    return sum(f.endswith(".mp3") for _, _, files in os.walk(os.path.join(VOICE, folder)) for f in files)


manifest = json.load(open(os.path.join(VOICE, "manifest.json"), encoding="utf-8"))["clips"]
templates = json.load(open(os.path.join(VOICE, "modular_rules.json"), encoding="utf-8"))["templates"]
manager_src = open(os.path.join(BACKEND, "state_mgmt", "manager.py"), encoding="utf-8").read()
emitted = set(re.findall(r'emit_event\("([a-z0-9_]+)"', manager_src))
plan_src = re.search(r"SESSION_RADIO_PLAN = \{(.*?)\n    \}", manager_src, re.S)
plans = dict(re.findall(r'"(\w+)": \{([^}]*)\}', plan_src.group(1))) if plan_src else {}

L = []
w = L.append
w("# 엔지니어 무전 문구 목록")
w("")
w("> 이 문서는 `python tools/gen_voice_lines_md.py`로 자동 생성됩니다. 문구를 고칠 때는 아래 원본을 고친 뒤 다시 생성하세요.")
w("> 원본: `backend/data/voice/manifest.json` · `modular_rules.json` · `backend/state_mgmt/engineer_brain.py` · `manager.py`")
w("")
w("음성은 모두 미리 만들어 둔 mp3입니다(실시간 TTS 아님). 현재 음성은 Red Bull 엔지니어 한 명뿐입니다.")
w("")

# ------------------------------------------------------------------ 1. when
w("## 1. 언제 무엇을 말하나")
w("")
w("무전과 무전 사이는 최소 6초 간격입니다. 같은 조건은 한 번만 말합니다(조건마다 랩당/세션당).")
w("")
if plans:
    w("| 세션 | 켜지는 무전 |")
    w("|---|---|")
    names = {"corner_brake": "코너 브레이킹", "pace_info": "랩 페이스", "pace_box": "페이스 급락 피트 콜",
             "traction": "탈출 트랙션", "tyre_deg": "타이어 마모", "box": "피트 창/피트인",
             "gap": "앞차 갭", "setup": "셋업 조언"}
    for sess, body in plans.items():
        keys = re.findall(r'"(\w+)"', body)
        w(f"| {sess} | {', '.join(names.get(k, k) for k in keys)} |")
    w("")
w("| 무전 | 나오는 조건 |")
w("|---|---|")
w("| 라디오 체크 | 세션 시작 시 1회 |")
w("| 코너 브레이킹 | 코너 탈출 지점 +15 m를 지날 때, 이번 세션 가장 빠른 랩과 그 코너 브레이킹 지점을 비교. "
  "차이가 5~45 m(레이스는 10~45 m)일 때. 두 랩 모두 그 코너에서 브레이크 페달을 실제로 밟은 경우만 "
  "(리프트·풀스로틀 통과·킹크 코너·감속으로 추정한 브레이크 값은 제외). 코너 정의가 있는 서킷만 |")
w("| 랩 페이스 | 직전 랩 대비 +0.45~1.0초 느림 → 페이스 저하, −0.2~−1.0초 빠름 → 페이스 개선. "
  "레이스에서 +1.0초 이상 → 피트인 콜. SC/VSC·피트 랩은 제외 |")
w("| 탈출 트랙션 | 지난 랩 가장 느린 코너 탈출 속도가 110 km/h 미만. 세션당 1회 |")
w("| 타이어 마모 | 랩당 마모율 5% 이상 / 10% 이상, 장착 컴파운드별 문장 |")
w("| 피트 창 / 피트인 | 가장 많이 닳은 타이어 마모 38% 이상 → 피트 창, 45% 이상 → Box this lap |")
w("| 앞차 갭 | 랩당 1회, 출발선 뒤 150~600 m 구간, 앞차와 10초 이내 |")
w("| 셋업 조언 | 2랩 이후, 150~600 m 구간, 아래 4장 규칙에 맞을 때. 같은 규칙은 4랩에 한 번 |")
w("| 질문 답변 | 대시보드 '엔지니어에게 질문'에서 물어볼 때 |")
w("")

# ------------------------------------------------------------------ 2. fixed clips
w(f"## 2. 고정 무전 클립 ({len(manifest)}개)")
w("")
w("`backend/data/voice/clips/`. **자동**은 위 조건에서 실제로 나오는 클립, **—** 는 지금은 자동으로 나오지 않는 클립입니다"
  "(코너 브레이킹·갭은 3장의 숫자 문장으로 대체됨).")
w("")
w("| 자동 | id | 상황 | 문장 |")
w("|---|---|---|---|")
for c in manifest:
    w(f"| {'자동' if c['id'] in emitted else '—'} | `{c['id']}` | {cell(c.get('scenario', ''))} | {cell(c['text'])} |")
w("")

# ------------------------------------------------------------------ 3. stitched
live_templates = {"braking_early", "braking_late", "gap_ahead", "pace_drop_box"}
w("## 3. 숫자가 들어가는 무전")
w("")
w("숫자만 바꿔 말하는 문장입니다. 값별로 미리 만든 문장 파일(`phrases/`)이 있으면 그것을, 없으면 앞·숫자·뒤 조각(`segments/`)을 이어 붙여 재생합니다.")
w("")
w("| 자동 | 템플릿 | 문장 |")
w("|---|---|---|")
for name, t in templates.items():
    pat = t["prefix"]["text"] + t["number_pattern"] + t["suffix"]["text"]
    if "drs_suffix" in t:
        pat += f" / (1초 미만) {t['prefix']['text']}{t['number_pattern']}{t['drs_suffix']['text']}"
    w(f"| {'자동' if name in live_templates else '—'} | `{name}` | {cell(pat)} |")
w("")
phr = OrderedDict()
pdir = os.path.join(VOICE, "phrases")
for f in sorted(os.listdir(pdir)) if os.path.isdir(pdir) else []:
    m = re.match(r"([a-z_]+?)_(\d+(?:_\d+)?)\.mp3$", f)
    if m:
        phr.setdefault(m.group(1), []).append(float(m.group(2).replace("_", ".")))
w("| 값별 문장 파일 (`phrases/`) | 개수 | 값 범위 |")
w("|---|---|---|")
unit = {"brake_early": " m", "brake_late": " m"}
for k, vals in phr.items():
    vals.sort()
    w(f"| `{k}_*` | {len(vals)} | {vals[0]:g} ~ {vals[-1]:g}{unit.get(k, ' 초')} |")
w("")
if count_mp3("segments") == 0:
    w("> `segments/`(앞·숫자·뒤 조각) 폴더는 현재 비어 있습니다. 그래서 위 범위를 벗어난 값"
      "(예: 페이스 급락이 범위 최댓값보다 큰 경우)은 자막은 정상으로 표시되지만 음성은 `radio_check` 클립으로 대신 재생됩니다.")
    w("")

# ------------------------------------------------------------------ 4. setup
cond = {
    "setup_tyres_hot": "4바퀴 표면 온도 평균 > 105 °C",
    "setup_tyres_cold": "4바퀴 표면 온도 평균 < 85 °C",
    "setup_fronts_hot": "앞이 뒤보다 8 °C 이상 높고 앞 > 100 °C",
    "setup_rears_hot": "뒤가 앞보다 8 °C 이상 높고 뒤 > 100 °C",
    "setup_front_limited": "앞 마모율 ≥ 1%/랩이고 뒤의 1.3배 이상",
    "setup_rear_limited": "뒤 마모율 ≥ 1%/랩이고 앞의 1.3배 이상",
    "setup_balance_ok": "위 조건에 모두 해당하지 않음(질문했을 때만 답함)",
}
w(f"## 4. 셋업 조언 ({len(brain.SETUP_TEXT)}개)")
w("")
w("`backend/data/voice/setup/`. 최근 깨끗한 2랩 평균으로 판단하고, 위에서부터 처음 맞는 규칙 하나만 말합니다. 기준은 `docs/SETUP_GUIDE.md`.")
w("")
w("| key | 조건 | 영어 | 한국어 |")
w("|---|---|---|---|")
for k, (en, ko) in brain.SETUP_TEXT.items():
    w(f"| `{k}` | {cell(cond.get(k, ''))} | {cell(en)} | {cell(ko)} |")
w("")

# ------------------------------------------------------------------ 5. Q&A
w("## 5. 질문 답변")
w("")
w("### 5-1. 질문 프리셋과 인식 키워드")
w("")
w("질문 문장에 아래 키워드가 들어 있으면 해당 주제로 답합니다(위에서부터 먼저 맞는 것).")
w("")
kw = dict(brain.INTENTS)
w("| 주제 | 프리셋 질문 (한국어 / English) | 인식 키워드 |")
w("|---|---|---|")
for p in brain.PRESET_QUESTIONS:
    w(f"| `{p['intent']}` | {cell(p['ko'])} / {cell(p['en'])} | {cell(', '.join(kw.get(p['intent'], [])))} |")
w("")
w(f"### 5-2. 고정 답변 ({len(brain.QA_TEXT)}개)")
w("")
w("| key | 영어 | 한국어 |")
w("|---|---|---|")
for k, (en, ko) in brain.QA_TEXT.items():
    w(f"| `{k}` | {cell(en)} | {cell(ko)} |")
w("")
groups = OrderedDict()
for k, v in brain.NUMBERED_TEXT.items():
    m = re.match(r"(.+?)_(\d+(?:_\d+)?)$", k)
    pat = f"{m.group(1)}_{{n}}" if m else k
    groups.setdefault(pat, []).append((m.group(2) if m else "", v))
w(f"### 5-3. 숫자가 들어가는 답변 ({len(brain.NUMBERED_TEXT)}개)")
w("")
w("값마다 문장 파일이 따로 있습니다(`backend/data/voice/qa/`). 표에는 첫 값과 마지막 값만 적었습니다.")
w("")
w("| 패턴 | 개수 | 값 범위 | 예시 (영어) | 예시 (한국어) |")
w("|---|---|---|---|---|")
for pat, items in groups.items():
    first, last = items[0], items[-1]
    rng = first[0].replace("_", ".") + (f" ~ {last[0].replace('_', '.')}" if len(items) > 1 else "")
    ex_en = first[1][0] + (f" … {last[1][0]}" if len(items) > 1 else "")
    ex_ko = first[1][1] + (f" … {last[1][1]}" if len(items) > 1 else "")
    w(f"| `{pat}` | {len(items)} | {rng} | {cell(ex_en)} | {cell(ex_ko)} |")
w("")
w("답변에는 3장의 브레이킹·갭 문장도 섞여 나옵니다(예: \"가장 크게 잃은 곳은 5번 코너\" + \"브레이킹이 약 12m 늦었습니다\").")
w("")

# ------------------------------------------------------------------ 6. files
w("## 6. 파일 위치")
w("")
w("| 폴더 | 파일 수 | 내용 |")
w("|---|---|---|")
for folder, desc in [("clips", "2장 고정 무전"), ("phrases", "3장 값별 문장"), ("segments", "3장 이어 붙이기용 조각 (하위 폴더)"),
                     ("setup", "4장 셋업 조언"), ("qa", "5장 질문 답변"), ("reference", "음성 학습용 원본 목소리")]:
    w(f"| `backend/data/voice/{folder}/` | {count_mp3(folder)} | {desc} |")
w("")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(L))
print(f"wrote {OUT} ({len(L)} lines)")
