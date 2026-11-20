import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

correct_block = '''function useVoicePlayer() {
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

function Dashboard({ settings, setSettings, onExit }) {
  const t = i18n[settings.language || 'ko'];
  const [data, setData] = useState(null);
  const [manifestClips, setManifestClips] = useState(DEFAULT_MANIFEST_CLIPS);
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

# Match from `function useVoicePlayer() {` down to `stopVoiceClip,\s*\}\s*=\s*useVoicePlayer\(\);`
pattern = r'function useVoicePlayer\(\) \{.*?stopVoiceClip,\s*\}\s*=\s*useVoicePlayer\(\);'
new_content, count = re.subn(pattern, correct_block, content, count=1, flags=re.DOTALL)

if count > 0:
    with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Fixed useVoicePlayer and Dashboard recursion bug!")
else:
    print("ERROR: Pattern not matched!")
