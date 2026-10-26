# Practical Local Demo Video Capture & Edit Recipe

Zero mandatory provider-fee recipe for capturing and publishing developer terminal demos and product walkthroughs using native screen capture, `ffmpeg`, and `ffprobe`. Incurs zero commercial platform or SaaS generation fees; developer labor and hardware compute are accounted separately.

## 1. Environment & Terminal Setup

1. **Resolution & Geometry**:
   - Target 16:9 aspect ratio: `1920x1080` (1080p) or `1280x720` (720p).
   - Set terminal font size to $\ge 18\text{px}$ (e.g., JetBrains Mono or Fira Code) to ensure readability on mobile and embedded web players.
2. **Clean Environment**:
   - Set a clean prompt: `export PS1='$ '`.
   - Clear terminal before recording: `clear`.
   - Mute desktop notifications and hide system menu/dock.
3. **Verified Script Execution**:
   - Walk through commands manually before recording to ensure zero crashes, unexpected warnings, or network hangs.
   - Ground each command in verified repository code (`claim_ref`).

## 2. Capture Methods

### Method A: macOS Native Window Capture
```bash
# Capture specific window to MOV
screencapture -v -k demo_raw.mov
```

### Method B: OBS Studio / QuickTime
- Source: Display or Application Window (lock aspect ratio to 16:9).
- Audio: High-quality USB microphone or clean system audio (48kHz, mono or stereo).

## 3. FFmpeg Processing & Post-Production Recipes

### Step 1: Normalize Container, Framerate, and Codec
Convert raw capture to standard H.264/AAC at 30 fps:
```bash
ffmpeg -y -i demo_raw.mov \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  demo_normalized.mp4
```

### Step 2: Crop & Pad to Exact 1920x1080
If recording window deviates from 16:9:
```bash
ffmpeg -y -i demo_normalized.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -c:a copy \
  demo_1080p.mp4
```

### Step 3: Embed WebVTT Subtitles (Soft Captions)
Generate `captions.vtt` with the storyboard CLI first: storyboard caption offsets are scene-local, and `--format vtt` resolves them onto the global video timeline. Feed only that compiled file to `ffmpeg`; scene-local offsets are not playable timestamps.
Embed synchronized subtitles into MP4 for native video player caption selection:
```bash
ffmpeg -y -i demo_1080p.mp4 -i captions.vtt \
  -c:v copy -c:a copy -c:s mov_text \
  -metadata:s:s:0 language=eng \
  demo_captioned.mp4
```

### Step 4: Burn-in Subtitles (Hard Captions for Social / Preview)
When creating standalone video previews for platforms without WebVTT support:
```bash
ffmpeg -y -i demo_1080p.mp4 \
  -vf "subtitles=captions.vtt:force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3'" \
  -c:a copy \
  demo_hardcoded.mp4
```

### Step 5: Generate Lightweight GIF / WebP Snippet
Produce an animated preview snippet (e.g., for README or PR review):
```bash
ffmpeg -y -ss 00:00:05 -t 8 -i demo_1080p.mp4 \
  -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 demo_preview.gif
```

## 4. Verification with ffprobe

Verify video specs before publishing:
```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,duration \
  -of default=noprint_wrappers=1 \
  demo_captioned.mp4
```

Expected attributes:
- Video stream: `codec_name=h264`, `width=1920`, `height=1080`, `r_frame_rate=30/1`.
- Audio stream: `codec_name=aac`, `sample_rate=48000`.
- Subtitle stream: `codec_name=mov_text`, `language=eng`.
