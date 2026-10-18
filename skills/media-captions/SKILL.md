---
name: media-captions
description: Use when publishing video, audio, or a podcast, when a video has no captions, when someone asks for a transcript, or when audio plays automatically on page load.
---

# Media captions and descriptions

**Criteria:** SC 1.2.1 Audio-only and Video-only (Prerecorded), SC 1.2.2 Captions (Prerecorded), SC 1.2.3 Audio Description or Media Alternative (Prerecorded), SC 1.2.4 Captions (Live), SC 1.2.5 Audio Description (Prerecorded), SC 1.4.2 Audio Control

Captions, audio description, and a transcript are three different things that
solve three different problems, and the criteria treat them separately. The
usual failure is shipping one of them and assuming it covers the others — a
transcript is not captions, and captions contain nothing about what is on
screen.

## When to use

- Adding captions, audio description, or a transcript to prerecorded media.
- A video, podcast, or screen recording is about to ship.
- A hero video or any audio plays automatically with sound.
- Producing or streaming a live event.
- Reviewing a third-party embed (a course platform, YouTube, Vimeo, a webinar tool).

## Procedure

1. **Classify the media, then let the criteria attach.** What the media carries
   decides which criterion applies:

   | Media | Requirement | Criterion |
   |---|---|---|
   | audio-only, prerecorded (a podcast) | a transcript (text alternative), or an audio-only alternative | SC 1.2.1 |
   | video-only, prerecorded (a silent animation) | a text alternative, or an audio track | SC 1.2.1 |
   | synchronized media, prerecorded | captions | SC 1.2.2 |
   | synchronized media, prerecorded | audio description **or** a media alternative | SC 1.2.3 |
   | synchronized media, live | captions | SC 1.2.4 |
   | synchronized media, prerecorded | audio description (no transcript escape hatch) | SC 1.2.5 |

2. **Keep the three deliverables distinct.**

   - **Captions** are synchronized text for deaf and hard-of-hearing viewers.
     They carry dialogue *and* non-speech information: speaker identification,
     sound effects, and meaningful music. They are turned on and off.
   - **Audio description** is for blind and low-vision viewers. It narrates
     visual information the audio does not convey — action, on-screen text,
     expressions — inserted into the natural pauses.
   - **A transcript** is a standalone text alternative. It satisfies SC 1.2.1
     for audio-only, and it can be the "media alternative" that SC 1.2.3 allows
     at Level A. It does **not** satisfy SC 1.2.2 or SC 1.2.5.

3. **Ship captions as a timed track, on by default.**

   ```vtt
   WEBVTT

   00:00:07.000 --> 00:00:11.500
   <v Narrator>Four of the six transports run on hydrogen.

   00:00:12.000 --> 00:00:14.000
   [ alarm beeping ]

   00:00:14.500 --> 00:00:18.000
   <v Dana>That alarm means the pressure test failed.
   ```

4. **Give the player a captions track where supported.** `kind="captions"` is not
   `kind="subtitles"` — subtitles translate dialogue only and drop the non-speech
   information that SC 1.2.2 requires.

   ```html
   <!-- Fails SC 1.2.2 and SC 1.2.5: a video with no captions and no description -->
   <video src="talk.mp4" autoplay controls></video>
   ```

   ```html
   <!-- Passes: captions on by default, a description track where supported,
        and a full text alternative next to the player -->
   <video controls preload="metadata" poster="talk.jpg">
     <source src="talk.webm" type="video/webm">
     <source src="talk.mp4" type="video/mp4">
     <track kind="captions" src="talk.en.vtt" srclang="en"
            label="English captions" default>
     <track kind="descriptions" src="talk.desc.vtt" srclang="en"
            label="English audio description">
   </video>
   <p><a href="#talk-transcript">Read the full transcript</a></p>
   ```

5. **Do not rely on `<track kind="descriptions">` alone.** Support is
   inconsistent and it is often off by default. Because SC 1.2.5 requires audio
   description at AA, ship either a described version of the video or a media
   alternative that includes every visual detail the audio omits.

6. **Control sound that starts on its own (SC 1.4.2).** If audio plays
   automatically for **more than 3 seconds**, provide a mechanism to pause or
   stop it, or to control its volume **independently of the system volume** —
   and place that control at the top of the page.

   ```html
   <!-- Passes SC 1.4.2 — muted autoplay, or a pause control before the audio -->
   <audio controls src="intro.mp3"></audio>
   <!-- If it must autoplay, mute it until the user opts in. -->
   <video autoplay muted loop playsinline src="hero.mp4"></video>
   ```

7. **For live events (SC 1.2.4), plan captions before the stream.** Human
   captioners are more accurate; if you use automatic speech recognition, keep a
   human correcting it. Have a backup if the caption feed drops.

## Verify

Presence of a track is not the test; watch and listen.

| Check | Passing looks like | Criterion |
|---|---|---|
| Watch with the sound off | captions render by default and track the audio | 1.2.2 |
| Listen with the screen off | every visual-only detail that matters is described | 1.2.3, 1.2.5 |
| Read the transcript alone | it conveys the same information as the media | 1.2.1, 1.2.3 |
| Load the page | no sound plays automatically for more than 3 seconds, or a control exists | 1.4.2 |
| Watch the live event | captions appear within a few seconds of speech and stay legible | 1.2.4 |

```js
// Captions must exist AND be on by default — presence alone is not enough,
// and neither is a track whose source failed to load.
const tracks = [...document.querySelectorAll('video track')];
const captions = tracks.find((t) => t.kind === 'captions');
console.assert(captions, 'no captions track');
console.assert(captions.default, 'captions exist but are off by default');
console.assert(captions.src.endsWith('.vtt'), 'captions track has no usable source');
```

## Failure modes

- **Auto-generated captions shipped uncorrected.** The track is present so the
  box is ticked, but names, jargon and sound effects are wrong. Accuracy is part
  of SC 1.2.2.
- **`kind="subtitles"` where captions are needed.** It reads as a pass in the
  markup and translates dialogue only, dropping non-speech information.
- **Using a transcript to satisfy SC 1.2.5.** A transcript can be the media
  alternative for SC 1.2.3 at Level A; it is not audio description, which is
  required separately at AA.
- **Autoplaying audio with no pause or volume control.** Almost always the
  marketing hero video. Fails SC 1.4.2 the moment it plays for more than 3
  seconds.
- **A captions `<track>` with no `default`, or a dead `src` path.** Captions
  exist in the source and never appear for the viewer; the `src` failure is
  silent.
- **Video-only prerecorded animation with no text alternative.** No captions
  would help; SC 1.2.1 needs a text alternative or an audio track.
- **An audio description file nobody links to.** It exists, so it is counted, but
  it is not discoverable from the player and most users never reach it.
- **Overcorrection — burning captions into the video.** They cannot be turned
  off, cannot be styled or resized, and cannot be translated or corrected.
