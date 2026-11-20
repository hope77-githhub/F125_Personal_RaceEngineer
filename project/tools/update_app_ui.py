import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Component RadioTestConsole
radio_test_console_code = '''
function RadioTestConsole({
  manifestClips,
  isPlayingVoice,
  currentVoiceClip,
  onPlayClip,
  onStopClip,
  t = {},
  isDarkMode = true,
}) {
  const [voiceCategory, setVoiceCategory] = useState("all");

  const categories = [
    { id: 'all', label: 'ALL', count: manifestClips.length, color: '#0052FF' },
    { id: 'braking', label: 'BRAKING (5~30M)', count: manifestClips.filter(c => c.category === 'braking').length, color: '#FF3B30' },
    { id: 'traction', label: 'TRACTION', count: manifestClips.filter(c => c.category === 'traction').length, color: '#FF9500' },
    { id: 'tyre_deg', label: 'TYRE & BOX', count: manifestClips.filter(c => c.category === 'tyre_deg').length, color: '#AF52DE' },
    { id: 'pace_delta', label: 'PACE DELTA', count: manifestClips.filter(c => c.category === 'pace_delta').length, color: '#34C759' },
    { id: 'rival_gap', label: 'RIVAL GAP', count: manifestClips.filter(c => c.category === 'rival_gap').length, color: '#5856D6' },
  ];

  const filteredClips = manifestClips.filter(
    (c) => voiceCategory === 'all' || c.category === voiceCategory
  );

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Category Pills Bar (Multi-row Wrap with High-Contrast Accent Pills) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          padding: '8px 10px',
          borderRadius: 'var(--rounded-md)',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
          marginBottom: '12px',
        }}
      >
        {categories.map((cat) => {
          const isActive = voiceCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setVoiceCategory(cat.id)}
              style={{
                backgroundColor: isActive
                  ? cat.color
                  : isDarkMode
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ffffff',
                color: isActive ? '#ffffff' : isDarkMode ? '#cfd3dc' : '#374151',
                border: isActive
                  ? `1px solid ${cat.color}`
                  : isDarkMode
                  ? '1px solid rgba(255, 255, 255, 0.16)'
                  : '1px solid #d1d5db',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 'var(--rounded-pill)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 10px ${cat.color}66` : 'none',
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.28)'
                    : isDarkMode
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.08)',
                  color: isActive ? '#ffffff' : isDarkMode ? '#ffffff' : '#1f2937',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Voice Clips Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          maxHeight: isDarkMode ? '240px' : '220px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {filteredClips.map((clip) => {
          const isPlaying = isPlayingVoice && currentVoiceClip?.id === clip.id;
          return (
            <button
              key={clip.id}
              onClick={() => onPlayClip(clip)}
              className={`voice-test-btn ${isPlaying ? 'active' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px 10px',
                gap: '4px',
                backgroundColor: isPlaying
                  ? 'var(--color-primary)'
                  : isDarkMode
                  ? 'var(--color-surface-dark-elevated)'
                  : '#ffffff',
                border: isPlaying
                  ? '1px solid var(--color-primary)'
                  : isDarkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid var(--color-hairline)',
                color: isPlaying ? '#ffffff' : isDarkMode ? '#ffffff' : 'var(--color-ink)',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '11px' }}>{clip.title}</span>
                {isPlaying && <span style={{ fontSize: '10px' }}>🔊</span>}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: isPlaying ? 'rgba(255,255,255,0.9)' : isDarkMode ? '#888ea0' : 'var(--color-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {clip.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useVoicePlayer() {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [currentVoiceClip, setCurrentVoiceClip] = useState(null);
  const [activeVoiceTranscript, setActiveVoiceTranscript] = useState(null);
  const audioRef = useRef(null);
  const activeSourceNodeRef = useRef(null);

  const playRadioBleep = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1350, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const stopVoiceClip = () => {
    if (activeSourceNodeRef.current) {
      try { activeSourceNodeRef.current.stop(); } catch (e) {}
      activeSourceNodeRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingVoice(false);
  };

  const playVoiceClip = async (clip) => {
    if (!clip) return;
    stopVoiceClip();
    playRadioBleep();

    setCurrentVoiceClip(clip);
    setActiveVoiceTranscript({
      text: clip.text,
      scenario: clip.scenario,
      title: clip.title,
      badge: clip.badge || 'RADIO',
    });
    setIsPlayingVoice(true);

    const ctx = getAudioContext();

    // Modular stitched event with multiple segments
    if (clip.segments && clip.segments.length > 0 && ctx) {
      try {
        const decodedBuffers = [];
        for (const segUrl of clip.segments) {
          const fullUrl = segUrl.startsWith('http') ? segUrl : `http://localhost:8080${segUrl}`;
          try {
            const res = await fetch(fullUrl);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arrayBuf);
              decodedBuffers.push(decoded);
            } else {
              console.warn(`Segment 404: ${fullUrl}, skipping segment`);
            }
          } catch (e) {
            console.warn(`Segment decode error: ${fullUrl}`);
          }
        }

        if (decodedBuffers.length > 0) {
          const stitchedBuffer = stitchAudioBuffers(ctx, decodedBuffers, 35);
          if (stitchedBuffer) {
            const source = ctx.createBufferSource();
            source.buffer = stitchedBuffer;
            activeSourceNodeRef.current = source;

            // Route through F1 Radio Bandpass & Saturation FX
            const radioFX = createF1RadioFX(ctx, ctx.destination);
            source.connect(radioFX);

            source.onended = () => {
              setIsPlayingVoice(false);
              activeSourceNodeRef.current = null;
              playRadioBleep();
            };

            source.start();
            return;
          }
        }
      } catch (err) {
        console.warn("Modular stitching error, falling back smoothly:", err);
      }
    }

    // Standard audio clip playback (resolve url or filename)
    const rawPath = clip.url || (clip.filename ? `/voice/clips/${clip.filename}` : null) || clip.fallback_url || '/voice/clips/radio_check.mp3';
    const audioUrl = rawPath.startsWith('http') ? rawPath : `http://localhost:8080${rawPath}`;

    // Prefer Web Audio API with realistic F1 team radio bandpass filter
    if (ctx) {
      try {
        const res = await fetch(audioUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          activeSourceNodeRef.current = source;
          const radioFX = createF1RadioFX(ctx, ctx.destination);
          source.connect(radioFX);
          source.onended = () => {
            setIsPlayingVoice(false);
            activeSourceNodeRef.current = null;
            playRadioBleep();
          };
          source.start();
          return;
        }
      } catch (e) {}
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlayingVoice(false);
      playRadioBleep();
    };

    audio.onerror = () => {
      if (!audioUrl.includes('radio_check.mp3')) {
        const fallbackAudio = new Audio('http://localhost:8080/voice/clips/radio_check.mp3');
        audioRef.current = fallbackAudio;
        fallbackAudio.play().catch(() => {});
        fallbackAudio.onended = () => {
          setIsPlayingVoice(false);
          playRadioBleep();
        };
      } else {
        setIsPlayingVoice(false);
      }
    };

    audio.play().catch(() => {
      setIsPlayingVoice(false);
    });
  };

  return {
    isPlayingVoice,
    setIsPlayingVoice,
    currentVoiceClip,
    activeVoiceTranscript,
    setActiveVoiceTranscript,
    playVoiceClip,
    stopVoiceClip,
    playRadioBleep,
  };
}
'''

# Place RadioTestConsole and useVoicePlayer right before `function Dashboard`
content = content.replace("function Dashboard({ settings, setSettings, onExit }) {", radio_test_console_code + "\nfunction Dashboard({ settings, setSettings, onExit }) {")

# In Dashboard: replace the voice states and playVoiceClip definition
dash_voice_init = '''  const [manifestClips, setManifestClips] = useState(DEFAULT_MANIFEST_CLIPS);
  const [autoRadioEnabled, setAutoRadioEnabled] = useState(true);
  const lastTriggeredVoiceIdRef = useRef(null);

  // Load clips from manifest.json API on mount
  useEffect(() => {
    fetch('http://localhost:8080/api/voice/clips')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.clips && resData.clips.length > 0) {
          setManifestClips(resData.clips);
        }
      })
      .catch(() => {});
  }, []);

  const {
    isPlayingVoice,
    currentVoiceClip,
    activeVoiceTranscript,
    playVoiceClip,
    stopVoiceClip,
  } = useVoicePlayer();'''

# Replace from `const [isPlayingVoice` down to end of playVoiceClip in Dashboard
pattern_dash_voice = r'const \[isPlayingVoice, setIsPlayingVoice\] = useState\(false\);.*?audio\.play\(\)\.catch\(\(\) => \{\s*setIsPlayingVoice\(false\);\s*\}\);\s*\};'
content = re.sub(pattern_dash_voice, dash_voice_init, content, flags=re.DOTALL)

# In Dashboard: Add id="gp-radio-console" to the Strategy card
content = content.replace(
  "{/* AI Race Engineer Strategy & Voice Test Console */}\n              <div",
  "{/* AI Race Engineer Strategy & Voice Test Console */}\n              <div id=\"gp-radio-console\""
)

# In Dashboard top nav: Add Team Radio button
top_nav_search = '<button onClick={onExit} className="btn-secondary-light">\n              EXIT\n            </button>'
top_nav_replace = '''<button
              onClick={() => {
                const el = document.getElementById('gp-radio-console');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary-light"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isPlayingVoice ? 'rgba(0,82,255,0.2)' : undefined,
                borderColor: isPlayingVoice ? 'var(--color-primary)' : undefined,
                color: isPlayingVoice ? 'var(--color-primary)' : undefined,
                cursor: 'pointer',
              }}
              title="Jump to Engineer Team Radio Console"
            >
              📻 <span>Team Radio</span>
              {isPlayingVoice && <span style={{ fontSize: '10px', color: 'var(--color-semantic-up)' }}>● LIVE</span>}
            </button>
            <button onClick={onExit} className="btn-secondary-light">
              EXIT
            </button>'''
content = content.replace(top_nav_search, top_nav_replace)

# In Dashboard: Replace the inline test console tabs & grid with <RadioTestConsole ... />
old_console_pattern = r'\{\/\* High-Visibility Category Filter Tabs \*\/\}.*?<div style=\{\{ display: \'grid\', gridTemplateColumns: \'repeat\(auto-fit, minmax\(135px, 1fr\)\).*?<\/div>\s*<\/div>'
new_console_jsx = '''<RadioTestConsole
                    manifestClips={manifestClips}
                    isPlayingVoice={isPlayingVoice}
                    currentVoiceClip={currentVoiceClip}
                    onPlayClip={playVoiceClip}
                    onStopClip={stopVoiceClip}
                    t={t}
                    isDarkMode={true}
                  />
                </div>'''

content = re.sub(old_console_pattern, new_console_jsx, content, flags=re.DOTALL)

# In SetupPage: Add manifestClips and useVoicePlayer
setup_func_head = 'function SetupPage({ onStart }) {\n  const [port, setPort] = useState(20777);'
setup_func_new = '''function SetupPage({ onStart }) {
  const [port, setPort] = useState(20777);
  const [manifestClips, setManifestClips] = useState(DEFAULT_MANIFEST_CLIPS);
  useEffect(() => {
    fetch('http://localhost:8080/api/voice/clips')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.clips && resData.clips.length > 0) {
          setManifestClips(resData.clips);
        }
      })
      .catch(() => {});
  }, []);

  const {
    isPlayingVoice,
    currentVoiceClip,
    activeVoiceTranscript,
    playVoiceClip,
    stopVoiceClip,
  } = useVoicePlayer();'''
content = content.replace(setup_func_head, setup_func_new)

# In SetupPage: Add RadioTestConsole inside the TTS section
setup_tts_end = '''                  <option value="adami">Ricky (Riccardo Adami) — Scuderia Ferrari</option>
                </select>
              </div>
            )}'''
setup_tts_new = '''                  <option value="adami">Ricky (Riccardo Adami) — Scuderia Ferrari</option>
                </select>

                {/* Engineer Radio Voice Preview & Test Console */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
                      📻 {t.radioTestConsole || 'Engineer Radio Test Console (TTS/Voice Tester)'}
                    </span>
                    {isPlayingVoice ? (
                      <button
                        onClick={stopVoiceClip}
                        className="voice-test-btn"
                        style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: 'var(--color-semantic-down)', borderColor: 'var(--color-semantic-down)' }}
                      >
                        ⏹ {t.stopRadio || 'STOP'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        {manifestClips.length} High-Res Voice Clips
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '8px' }}>
                    {t.radioTestDesc || 'Click any button to test the engineer\\'s pit-wall voice clips:'}
                  </div>
                  {activeVoiceTranscript && (
                    <div
                      style={{
                        backgroundColor: 'rgba(0,82,255,0.06)',
                        border: '1px solid rgba(0,82,255,0.2)',
                        padding: '10px 14px',
                        borderRadius: 'var(--rounded-md)',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '3px' }}>
                        {activeVoiceTranscript.badge} · {activeVoiceTranscript.scenario}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                        "{activeVoiceTranscript.text}"
                      </div>
                    </div>
                  )}
                  <RadioTestConsole
                    manifestClips={manifestClips}
                    isPlayingVoice={isPlayingVoice}
                    currentVoiceClip={currentVoiceClip}
                    onPlayClip={playVoiceClip}
                    onStopClip={stopVoiceClip}
                    t={t}
                    isDarkMode={false}
                  />
                </div>
              </div>
            )}'''
content = content.replace(setup_tts_end, setup_tts_new)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied transformation script successfully!")
