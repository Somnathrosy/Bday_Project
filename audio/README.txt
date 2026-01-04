Replace this placeholder with your MP3 file named `song.mp3`.

Steps:
1. Put your MP3 file at: audio/song.mp3 (relative to the project root `surprise-main`).
2. If you want a different filename, update the <source> element in `index.html`:
   <source src="audio/your-file.mp3" type="audio/mp3">
3. Autoplay may be blocked by some browsers. Use the play/pause button at the bottom-right to start playback if needed.
4. If you want the audio to stop on navigation, edit the `goToNextPage()` function in `index.html` to pause the audio before changing pages.

Notes:
- Do NOT place the MP3 in a path with spaces or special characters to avoid URL issues.
- For best compatibility, provide an MP3 encoded at 128 kbps or 192 kbps.
