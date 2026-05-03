# Uyghur Dutar Tuner

A web-based chromatic tuner designed specifically for the **Uyghur dutar** (دۇتار) — a two-stringed long-necked lute from Central Asia.

🎵 **[Try it live →](https://YOUR-USERNAME.github.io/dutar-tuner/)**


## What it does

- Listens through your microphone and detects the pitch of plucked strings in real time
- Shows the detected note, target string, and how many cents off you are
- Supports the four most common Uyghur dutar tunings (A3–D4, A3–E4, G3–D4, G3–C4)
- Visual needle meter for at-a-glance feedback while tuning

## Tech

Built with **React** and **Vite**, styled with **Tailwind CSS**. Pitch detection uses **autocorrelation with parabolic interpolation** on time-domain audio data from the **Web Audio API** — accurate to within a few cents.

## Running locally

```bash
git clone https://github.com/YOUR-USERNAME/dutar-tuner.git
cd dutar-tuner
npm install
npm run dev
```

Then open `http://localhost:5173` and grant microphone access.

## Notes

The dutar has many regional tuning conventions across Uyghur, Uzbek, Tajik, and Turkmen traditions. This tuner targets the most common Uyghur conventions — for other traditions, use the custom tuning option.

Browser microphone access requires HTTPS, so the live demo runs over GitHub Pages' HTTPS. Local development works on `localhost`.