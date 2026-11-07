# Clock

A small browser game for kids learning to read an analog clock.

An analog clock shows a time. Type what time it is on the digit pad
(four keys: hour, hour, minute, minute, e.g. `0` `7` `3` `0` for 7:30)
and press the check button. Correct answers earn stars and confetti.

## Play

Open `index.html` in any browser. No build step, no dependencies.

## Features

- Analog clock with a new random time each round
- Four difficulty levels (icon buttons, no text):
  - clock icon: full hours
  - half-past icon: full and half hours
  - quarter icon: quarter hours
  - dice icon: any five minutes
- Big on-screen digit pad with backspace, hint (lightbulb) and check button
- Stars (total) and streak (fire) counters, saved in the browser
- Happy / gentle error sounds, mutable with the speaker icon
- Works with touch, mouse and keyboard (digits, Backspace, Enter)

## Files

- `index.html` - page and layout
- `style.css` - styling and animations in the shared Pond house style
- `game.js` - clock drawing (SVG), game logic, sound (Web Audio)
- `assets/fonts/` - Nunito (SIL Open Font License 1.1, see `OFL.txt`), bundled locally

Styling follows the shared Pond style guide:
https://github.com/torothefrog/pond/blob/main/STYLE_GUIDE.md
