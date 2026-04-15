# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/dino-hack.spec.mjs >> Chrome Dino Hack post >> embedded dino game iframe loads the game
- Location: tests/e2e/dino-hack.spec.mjs:18:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#dino-game-frame').contentFrame().locator('canvas').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('#dino-game-frame').contentFrame().locator('canvas').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "Mathew Sachin" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic [ref=e5]:
        - list [ref=e6]:
          - listitem [ref=e7]:
            - link "Blog" [ref=e8] [cursor=pointer]:
              - /url: /blog/
          - listitem [ref=e9]:
            - link "Tools" [ref=e10] [cursor=pointer]:
              - /url: /tools/
          - listitem [ref=e11]:
            - link "Privacy Policy" [ref=e12] [cursor=pointer]:
              - /url: /privacy_policy/
        - link " Search" [ref=e13] [cursor=pointer]:
          - /url: /search/
          - generic [ref=e14]: 
          - text: Search
  - progressbar "Reading progress"
  - generic [ref=e15]:
    - generic [ref=e17]:
      - heading "Hacking the Chrome Dino Game" [level=2] [ref=e18]:
        - generic [ref=e19]: 
        - text: Hacking the Chrome Dino Game
      - emphasis [ref=e20]: 5 Nov 2016
      - text: "-"
      - emphasis [ref=e21]: 9 min read
      - generic [ref=e22]:
        - link "chrome" [ref=e23] [cursor=pointer]:
          - /url: /blog/tags/#chrome
        - link "hack" [ref=e24] [cursor=pointer]:
          - /url: /blog/tags/#hack
        - link "game" [ref=e25] [cursor=pointer]:
          - /url: /blog/tags/#game
      - separator [ref=e26]
      - generic [ref=e27]:
        - generic [ref=e28]: 
        - text: Part 4 of 27 —
        - link "Browser Hacks" [ref=e29] [cursor=pointer]:
          - /url: /blog/series/browser-hacks/
        - text: series
        - 'link "Previous: Watch YouTube Shorts in the Normal Player (No Extensions Required)" [ref=e30] [cursor=pointer]':
          - /url: /blog/2026/03/31/youtube-shorts-normal-player.html
          - generic [ref=e31]: 
          - text: "Previous: Watch YouTube Shorts in the Normal Player (No Extensions Required)"
    - generic [ref=e34]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - paragraph [ref=e39]:
            - emphasis [ref=e40]: All hacks updated as of 8th March 2026 based on game changes.
          - separator [ref=e41]
          - paragraph [ref=e42]:
            - emphasis [ref=e43]: Tired of just jumping over cacti? Let’s take it to the next level with some simple hacks you can try right in your browser!
          - heading "What is the Chrome Dino Game?" [level=2] [ref=e44]
          - paragraph [ref=e45]: When you lose internet connection in Chrome, a hidden endless runner game appears. Tap space to start, and our pixelated dino begins a desert adventure!
          - paragraph [ref=e46]: But… what if we could cheat?
          - paragraph [ref=e47]: "Even if you’re not a programmer, here’s something cool: the Chrome Dino game is built using JavaScript, and its internal game code is exposed globally. That means we can actually poke around and change how the game works — right from the browser!"
          - paragraph [ref=e48]: Thanks to JavaScript’s flexible (and kinda wild) nature, we can override built-in functions and tweak the game’s behavior without needing to dig into the source files. All you need is the Chrome Developer Console, and a few clever lines of code.
          - heading "How to Play the Chrome Dino Game?" [level=2] [ref=e49]
          - generic [ref=e50]:
            - text: "💡 Pro Tip: Can’t get the “No Internet” screen to show up?"
            - text: Just open a new tab and go to chrome://dino — the game works even when you're online!
          - paragraph [ref=e51]:
            - text: "If this is your first time discovering the Dino game, welcome! It’s super easy to play:"
            - strong [ref=e52]: "Jump:"
            - text: Press Spacebar or Up Arrow (this also starts the game)
            - strong [ref=e53]: "Duck:"
            - text: Press Down Arrow (useful when those sneaky pterodactyls appear after 450 points)
            - strong [ref=e54]: "Pause:"
            - text: Press Alt
            - strong [ref=e55]: "Night Mode:"
            - text: Every 700 points, the background switches to black for 100 points — just to keep you on your toes!
          - paragraph [ref=e56]:
            - img "Chrome Dino" [ref=e57] [cursor=pointer]
          - heading "Play It Right Here" [level=2] [ref=e58]
          - generic [ref=e59]:
            - iframe [ref=e60]:
              - generic [active] [ref=f1e1]:
                - heading "Error response" [level=1] [ref=f1e2]
                - paragraph [ref=f1e3]: "Error code: 404"
                - paragraph [ref=f1e4]: "Message: File not found."
                - paragraph [ref=f1e5]: "Error code explanation: 404 - Nothing matches the given URI."
            - generic [ref=e61]:
              - text: Chrome Dino game ©
              - link "The Chromium Authors" [ref=e62] [cursor=pointer]:
                - /url: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/neterror/resources/
              - text: ", open-sourced under the"
              - link "BSD 3-Clause License" [ref=e63] [cursor=pointer]:
                - /url: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/LICENSE
              - text: . Extracted by
              - link "@liuwayong" [ref=e64] [cursor=pointer]:
                - /url: https://github.com/wayou/t-rex-runner
              - text: .
          - heading "Opening Developer Tools / Chrome Console" [level=2] [ref=e65]
          - paragraph [ref=e66]:
            - text: The [
            - strong [ref=e67]: Developer Tools
            - text: "(DevTools)]({% post_url /blog/2026-03-07-edit-webpage-inspect-element %}) is a panel built right into Chrome that lets you inspect and interact with any web page — including its JavaScript code. Think of it as a secret control room for the browser."
          - paragraph [ref=e68]: "To open it and get to the Console:"
          - paragraph [ref=e69]:
            - strong [ref=e70]: "On Windows / Linux:"
          - list [ref=e71]:
            - listitem [ref=e72]:
              - text: Press
              - code [ref=e73]: F12
              - text: or
              - code [ref=e74]: Ctrl + Shift + I
              - text: to open DevTools, then click the
              - strong [ref=e75]: Console
              - text: tab.
            - listitem [ref=e76]:
              - text: "Shortcut:"
              - code [ref=e77]: Ctrl + Shift + J
              - text: jumps straight to the Console.
          - paragraph [ref=e78]:
            - strong [ref=e79]: "On Mac:"
          - list [ref=e80]:
            - listitem [ref=e81]:
              - text: Press
              - code [ref=e82]: Cmd + Option + I
              - text: to open DevTools, then click the
              - strong [ref=e83]: Console
              - text: tab.
            - listitem [ref=e84]:
              - text: "Shortcut:"
              - code [ref=e85]: Cmd + Option + J
              - text: jumps straight to the Console.
          - paragraph [ref=e86]:
            - text: You’ll see a blinking cursor where you can type JavaScript commands directly. After typing each command, press
            - strong [ref=e87]: Enter
            - text: to run it.
          - paragraph [ref=e88]: "A few things to keep in mind:"
          - list [ref=e89]:
            - listitem [ref=e90]:
              - text: The commands are
              - strong [ref=e91]: case-sensitive
              - text: — type them exactly as shown.
            - listitem [ref=e92]:
              - text: Seeing
              - code [ref=e93]: undefined
              - text: after a command? That’s completely normal. It just means the expression didn’t return a value, which is expected for most of these hacks.
          - generic [ref=e94]:
            - text: 📱 On a phone or tablet? Mobile browsers don’t have DevTools — but you can still hack the Dino using a bookmarklet. No computer needed!
            - text: "👉 {% include post_link.html url=\"/blog/2026/03/19/chrome-dino-hack-mobile-bookmarklet\" %}"
          - heading "Immortality (God Mode)" [level=2] [ref=e95]
          - paragraph [ref=e96]:
            - text: Want to make your dino un-killable? Let’s activate
            - strong [ref=e97]: God Mode
            - text: using a little JavaScript magic.
          - heading "Activate God Mode" [level=5] [ref=e98]
          - paragraph [ref=e99]: "Paste this into the Console to save the original function and disable game over in one go:"
          - generic [ref=e100]:
            - generic [ref=e101]:
              - generic [ref=e102]: js
              - button "Copy code to clipboard" [ref=e103] [cursor=pointer]:
                - generic [ref=e104]: 
            - code [ref=e106]:
              - generic [ref=e107]: var original = Runner.prototype.gameOver;
              - generic [ref=e108]: "Runner.prototype.gameOver = function() {};"
          - paragraph [ref=e109]: Boom — your dino is now immortal. It’ll just run through cacti like a champ.
          - heading "How to Stop It" [level=5] [ref=e110]
          - paragraph [ref=e111]: "If you want to restore the game to normal (or get bored of being a god), use this:"
          - generic [ref=e112]:
            - generic [ref=e113]:
              - generic [ref=e114]: js
              - button "Copy code to clipboard" [ref=e115] [cursor=pointer]:
                - generic [ref=e116]: 
            - code [ref=e118]:
              - generic [ref=e119]: Runner.prototype.gameOver = original;
          - paragraph [ref=e120]: This only works if you ran the block above first. Otherwise, just refresh the page.
          - heading "How does it work?" [level=5] [ref=e121]
          - paragraph [ref=e122]: In JavaScript, functions are just objects — and they can be replaced on the fly.
          - paragraph [ref=e123]:
            - text: The
            - code [ref=e124]: gameOver
            - text: function is normally triggered when the dino crashes. By saving it first (
            - code [ref=e125]: var original = ...
            - text: ) and then replacing it with an empty function (
            - code [ref=e126]: "function() {}"
            - text: ), we stop the game from ending.
          - paragraph [ref=e127]: When you’re done, you just restore the original function by assigning it back. Think of it like temporarily muting the crash handler!
          - paragraph [ref=e128]: This works only because JavaScript allows us to override methods of objects while the game is still running in the browser.
          - heading "Tweaking Speed" [level=2] [ref=e129]
          - paragraph [ref=e130]:
            - text: Want to put the pedal to the metal? Or maybe slow things down for a relaxing run? The game normally starts at a speed of around
            - strong [ref=e131]: "6"
            - text: and gradually increases as your score climbs. With this hack, you can take full control of the pace.
          - paragraph [ref=e132]:
            - text: Use the slider below to pick any speed —
            - code [ref=e133]: "1000"
            - text: for pure chaos,
            - code [ref=e134]: "50"
            - text: for a fast but still-playable pace, or
            - code [ref=e135]: "1"
            - text: for dramatic slow motion. The default starting speed is
            - code [ref=e136]: "6"
            - text: .
            - strong [ref=e137]: Move the slider and the game above updates instantly!
          - generic [ref=e138]:
            - generic [ref=e139]:
              - generic [ref=e140]: "Speed:"
              - slider "Speed slider" [ref=e141]: "6"
              - spinbutton "Speed value" [ref=e142]: "6"
              - button "Reset speed to default" [ref=e143] [cursor=pointer]:
                - generic [ref=e144]: 
                - text: Reset
              - button "Copy code to clipboard" [ref=e145] [cursor=pointer]:
                - generic [ref=e146]: 
            - code [ref=e148]: (Runner.instance_ || Runner.getInstance()).setSpeed(6)
          - heading "Setting the Current Score" [level=2] [ref=e149]
          - paragraph [ref=e150]:
            - text: Want to jump right into the action with a specific score? You can set the score to any value up to
            - strong [ref=e151]: "99999"
            - text: (but no higher!). Enter your target score below —
            - strong [ref=e152]: it applies instantly to the game at the top of this page!
          - generic [ref=e153]:
            - generic [ref=e154]:
              - generic [ref=e155]: "Score:"
              - spinbutton "Score value" [ref=e156]: "12345"
              - button "Reset score to default" [ref=e157] [cursor=pointer]:
                - generic [ref=e158]: 
                - text: Reset
              - button "Copy code to clipboard" [ref=e159] [cursor=pointer]:
                - generic [ref=e160]: 
            - code [ref=e162]: (Runner.instance_ || Runner.getInstance()).distanceRan = 12345 / 0.025
          - heading "How does it work?" [level=5] [ref=e163]
          - paragraph [ref=e164]:
            - text: Internally, the game tracks how far the dino has run using a property called
            - code [ref=e165]: distanceRan
            - text: . The visible score on screen is calculated by multiplying
            - code [ref=e166]: distanceRan
            - text: by
            - code [ref=e167]: "0.025"
            - text: . By dividing your desired score by that constant, you get the right internal value to set.
          - paragraph [ref=e168]: "⚠️ Note: The score resets when the game ends, so don’t forget to re-enter the command if you want to keep the score high!"
          - paragraph [ref=e169]: Experiment with different values to make your dino feel like a seasoned pro right from the start!
          - heading "Jumping Height" [level=2] [ref=e170]
          - paragraph [ref=e171]: Want your dino to leap over obstacles in a single bound, or keep jumps tight and controlled? You can tune the jump velocity to your liking.
          - paragraph [ref=e172]:
            - text: The default jump velocity is
            - strong [ref=e173]: "10"
            - text: . Increasing it makes your dino launch higher into the air, while decreasing it results in shorter, snappier hops.
            - strong [ref=e174]: Drag the slider and watch the change take effect live in the game above!
          - generic [ref=e175]:
            - generic [ref=e176]:
              - generic [ref=e177]: "Jump Velocity:"
              - slider "Jump velocity slider" [ref=e178]: "10"
              - spinbutton "Jump velocity value" [ref=e179]: "10"
              - button "Reset jump velocity to default" [ref=e180] [cursor=pointer]:
                - generic [ref=e181]: 
                - text: Reset
              - button "Copy code to clipboard" [ref=e182] [cursor=pointer]:
                - generic [ref=e183]: 
            - code [ref=e185]: (Runner.instance_ || Runner.getInstance()).tRex.setJumpVelocity(10)
          - paragraph [ref=e186]:
            - text: Try
            - code [ref=e187]: "20"
            - text: for floaty, sky-high jumps that easily clear everything on screen, or drop it to
            - code [ref=e188]: "5"
            - text: for a low, fast hop that’s great for clearing small cacti quickly. Combined with God Mode, a high jump velocity lets you sail through the entire game without a care in the world!
          - heading "Walk in Air" [level=2] [ref=e189]
          - paragraph [ref=e190]: Ever wondered what it’s like for the dino to defy gravity? You can make it walk through the sky with this fun trick!
          - paragraph [ref=e191]: "{% picture sky_dino.jpg alt=“Chrome Dino walking in air” width=“400” %}"
          - paragraph [ref=e192]:
            - text: The
            - code [ref=e193]: groundYPos
            - text: property controls the vertical position where the dino “rests” when not jumping — measured in pixels from the top of the canvas. The normal ground level is
            - strong [ref=e194]: "93"
            - text: . Setting it to
            - code [ref=e195]: "0"
            - text: moves the dino’s resting position to the very top of the screen.
          - paragraph [ref=e196]:
            - text: Use the slider to position the dino anywhere from the sky (
            - code [ref=e197]: "0"
            - text: ) to the normal ground level (
            - code [ref=e198]: "93"
            - text: ). Intermediate values like
            - code [ref=e199]: "40"
            - text: or
            - code [ref=e200]: "60"
            - text: let you glide over ground-level cacti without getting hit. Obstacles still scroll past at fixed heights, so this is a sneaky alternative to God Mode!
            - strong [ref=e201]: Try it live — the game above updates as you drag.
          - generic [ref=e202]:
            - generic [ref=e203]:
              - generic [ref=e204]: "Y Position:"
              - slider "Ground Y position slider" [ref=e205]: "93"
              - spinbutton "Ground Y position value" [ref=e206]: "93"
              - button "Reset Y position to default" [ref=e207] [cursor=pointer]:
                - generic [ref=e208]: 
                - text: Reset
              - button "Copy code to clipboard" [ref=e209] [cursor=pointer]:
                - generic [ref=e210]: 
            - code [ref=e212]: (Runner.instance_ || Runner.getInstance()).tRex.groundYPos = 93
          - heading "Auto-play" [level=2] [ref=e213]
          - paragraph [ref=e214]: Want the dino to play itself? There’s a JavaScript bot you can paste straight into the Console that detects every cactus and pterodactyl and reacts automatically.
          - paragraph [ref=e215]: "👉 {% include post_link.html url=“/blog/2026/03/14/chrome-dino-autoplay” %}"
          - heading "Invisibility" [level=2] [ref=e216]
          - paragraph [ref=e217]: Want to make your dino invisible? It’s easy to do by simply disabling its drawing function! This will prevent the dino from being rendered on the screen, making it fully invisible.
          - heading "Make the Dino Invisible" [level=5] [ref=e218]
          - generic [ref=e219]:
            - generic [ref=e220]:
              - generic [ref=e221]: js
              - button "Copy code to clipboard" [ref=e222] [cursor=pointer]:
                - generic [ref=e223]: 
            - code [ref=e225]:
              - generic [ref=e226]: const runner = Runner.instance_ || Runner.getInstance();
              - generic [ref=e227]: const originalDraw = runner.tRex.draw;
              - generic [ref=e228]: "runner.tRex.draw = function() {};"
          - paragraph [ref=e229]: This code replaces the dino’s draw function with an empty one, meaning the dino won’t be drawn on the canvas.
          - paragraph [ref=e230]:
            - strong [ref=e231]: "Note:"
            - text: The dino can still die if it collides with obstacles
          - heading "Restore the Dino" [level=5] [ref=e232]
          - paragraph [ref=e233]: "To bring the dino back, simply restore the original draw function:"
          - generic [ref=e234]:
            - generic [ref=e235]:
              - generic [ref=e236]: js
              - button "Copy code to clipboard" [ref=e237] [cursor=pointer]:
                - generic [ref=e238]: 
            - code [ref=e240]:
              - generic [ref=e241]: const runner = Runner.instance_ || Runner.getInstance();
              - generic [ref=e242]: runner.tRex.draw = originalDraw;
          - paragraph [ref=e243]: Now the dino is visible again, and the game continues as usual!
          - separator [ref=e244]
          - paragraph [ref=e245]: Keep having fun and may your dino run forever!
          - paragraph [ref=e246]: Share this page around and comment down if you have tricks of your own!
          - separator [ref=e247]
          - paragraph [ref=e248]: "Time to try some other great hacks — {% include post_link.html url=“/blog/2026/03/07/hacking-wordle” text=“Wordle” %}, {% include post_link.html url=“/blog/2026/03/20/hacking-minesweeper-online” text=“Minesweeper” %}, {% include post_link.html url=“/blog/2026/03/20/hacking-typeracer” text=“TypeRacer” %}."
        - separator [ref=e249]
        - generic [ref=e250]:
          - generic [ref=e251]: "Share:"
          - link "Share on Twitter/X" [ref=e252] [cursor=pointer]:
            - /url: https://twitter.com/intent/tweet?url=https%3A%2F%2Fmathewsachin.github.io%2Fblog%2F2016%2F11%2F05%2Fchrome-dino-hack%2F&text=Hacking%20the%20Chrome%20Dino%20Game
            - generic [ref=e253]: 
          - link "Share on Facebook" [ref=e254] [cursor=pointer]:
            - /url: https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fmathewsachin.github.io%2Fblog%2F2016%2F11%2F05%2Fchrome-dino-hack%2F
            - generic [ref=e255]: 
          - link "Share on Reddit" [ref=e256] [cursor=pointer]:
            - /url: https://www.reddit.com/submit?url=https%3A%2F%2Fmathewsachin.github.io%2Fblog%2F2016%2F11%2F05%2Fchrome-dino-hack%2F&title=Hacking%20the%20Chrome%20Dino%20Game
            - generic [ref=e257]: 
          - link "Share on LinkedIn" [ref=e258] [cursor=pointer]:
            - /url: https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fmathewsachin.github.io%2Fblog%2F2016%2F11%2F05%2Fchrome-dino-hack%2F
            - generic [ref=e259]: 
          - button "Copy link" [ref=e260] [cursor=pointer]:
            - generic [ref=e261]: 
        - navigation "Series navigation" [ref=e262]:
          - link "Previous in series Watch YouTube Shorts in the Normal Player (No Extensions Required)" [ref=e263] [cursor=pointer]:
            - /url: /blog/2026/03/31/youtube-shorts-normal-player.html
            - generic [ref=e264]: 
            - generic [ref=e265]:
              - generic [ref=e266]: Previous in series
              - generic [ref=e267]:
                - generic [ref=e268]: 
                - text: Watch YouTube Shorts in the Normal Player (No Extensions Required)
          - 'link "Next in series Hacking Wordle: Solve It in One Try Using Browser DevTools" [ref=e269] [cursor=pointer]':
            - /url: /blog/2026/03/07/hacking-wordle.html
            - generic [ref=e270]: 
            - generic [ref=e271]:
              - generic [ref=e272]: Next in series
              - generic [ref=e273]:
                - generic [ref=e274]: 
                - text: "Hacking Wordle: Solve It in One Try Using Browser DevTools"
        - generic [ref=e275]:
          - heading " You might also like" [level=5] [ref=e276]:
            - generic [ref=e277]: 
            - text: You might also like
          - generic [ref=e278]:
            - 'link "Read Hacking Wordle: Solve It in One Try Using Browser DevTools" [ref=e280] [cursor=pointer]':
              - /url: /blog/2026/03/07/hacking-wordle.html
              - generic [ref=e281]:
                - generic [ref=e282]:
                  - paragraph [ref=e283]:
                    - generic [ref=e284]: 
                    - text: "Hacking Wordle: Solve It in One Try Using Browser DevTools"
                  - text: Mar 7, 2026
                - generic [ref=e286]:
                  - generic [ref=e287]: 
                  - text: Read more
            - 'link "Read Hacking Minesweeper Online: Rigging the RNG" [ref=e289] [cursor=pointer]':
              - /url: /blog/2026/03/20/hacking-minesweeper-online.html
              - generic [ref=e290]:
                - generic [ref=e291]:
                  - paragraph [ref=e292]:
                    - generic [ref=e293]: 
                    - text: "Hacking Minesweeper Online: Rigging the RNG"
                  - text: Mar 20, 2026
                - generic [ref=e295]:
                  - generic [ref=e296]: 
                  - text: Read more
            - 'link "Read Hacking TypeRacer: The Human-Mimic Bot" [ref=e298] [cursor=pointer]':
              - /url: /blog/2026/03/20/hacking-typeracer.html
              - generic [ref=e299]:
                - generic [ref=e300]:
                  - paragraph [ref=e301]:
                    - generic [ref=e302]: 
                    - text: "Hacking TypeRacer: The Human-Mimic Bot"
                  - text: Mar 20, 2026
                - generic [ref=e304]:
                  - generic [ref=e305]: 
                  - text: Read more
            - 'link "Read Instagram Reel Sniper: Download Any Reel Directly from Your Browser" [ref=e307] [cursor=pointer]':
              - /url: /blog/2026/03/21/instagram-reel-sniper.html
              - generic [ref=e308]:
                - generic [ref=e309]:
                  - paragraph [ref=e310]:
                    - generic [ref=e311]: 
                    - text: "Instagram Reel Sniper: Download Any Reel Directly from Your Browser"
                  - text: Mar 21, 2026
                - generic [ref=e313]:
                  - generic [ref=e314]: 
                  - text: Read more
            - link "Read Reveal a Saved Password Hidden Behind Dots" [ref=e316] [cursor=pointer]:
              - /url: /blog/2019/12/07/unhide-password-box.html
              - generic [ref=e317]:
                - generic [ref=e318]:
                  - paragraph [ref=e319]:
                    - generic [ref=e320]: 
                    - text: Reveal a Saved Password Hidden Behind Dots
                  - text: Dec 7, 2019
                - generic [ref=e322]:
                  - generic [ref=e323]: 
                  - text: Read more
        - iframe [ref=e325]:
          
      - generic [ref=e327]:
        - generic [ref=e329]:
          - text:  
          - generic [ref=e331]:
            - generic [ref=e332]: 
            - text: Contents
          - navigation "Table of contents" [ref=e335]:
            - list [ref=e336]:
              - listitem [ref=e337]:
                - link "What is the Chrome Dino Game?" [ref=e338] [cursor=pointer]:
                  - /url: "#what-is-the-chrome-dino-game"
              - listitem [ref=e339]:
                - link "How to Play the Chrome Dino Game?" [ref=e340] [cursor=pointer]:
                  - /url: "#how-to-play-the-chrome-dino-game"
              - listitem [ref=e341]:
                - link "Play It Right Here" [ref=e342] [cursor=pointer]:
                  - /url: "#play-it-right-here"
              - listitem [ref=e343]:
                - link "Opening Developer Tools / Chrome Console" [ref=e344] [cursor=pointer]:
                  - /url: "#opening-developer-tools--chrome-console"
              - listitem [ref=e345]:
                - link "Immortality (God Mode)" [ref=e346] [cursor=pointer]:
                  - /url: "#immortality-god-mode"
              - listitem [ref=e347]:
                - link "Tweaking Speed" [ref=e348] [cursor=pointer]:
                  - /url: "#tweaking-speed"
              - listitem [ref=e349]:
                - link "Setting the Current Score" [ref=e350] [cursor=pointer]:
                  - /url: "#setting-the-current-score"
              - listitem [ref=e351]:
                - link "Jumping Height" [ref=e352] [cursor=pointer]:
                  - /url: "#jumping-height"
              - listitem [ref=e353]:
                - link "Walk in Air" [ref=e354] [cursor=pointer]:
                  - /url: "#walk-in-air"
              - listitem [ref=e355]:
                - link "Auto-play" [ref=e356] [cursor=pointer]:
                  - /url: "#auto-play"
              - listitem [ref=e357]:
                - link "Invisibility" [ref=e358] [cursor=pointer]:
                  - /url: "#invisibility"
        - generic:
          - generic:
            - insertion
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const DINO_HACK_URL = '/blog/2016/11/05/chrome-dino-hack.html';
  4   | 
  5   | test.describe('Chrome Dino Hack post', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.goto(DINO_HACK_URL);
  8   |   });
  9   | 
  10  |   // ── Embedded game ──────────────────────────────────────────────────────────
  11  | 
  12  |   test('embedded dino game iframe is present and visible', async ({ page }) => {
  13  |     const frame = page.locator('#dino-game-frame');
  14  |     await expect(frame).toBeVisible();
  15  |     await expect(frame).toHaveAttribute('src', '/dino/');
  16  |   });
  17  | 
  18  |   test('embedded dino game iframe loads the game', async ({ page }) => {
  19  |     const frameElement = page.locator('#dino-game-frame');
  20  |     await expect(frameElement).toBeVisible();
  21  |     const frameHandle = await frameElement.contentFrame();
  22  |     expect(frameHandle).not.toBeNull();
  23  |     // The dino page should contain a canvas element
> 24  |     await expect(frameHandle.locator('canvas').first()).toBeVisible({ timeout: 10000 });
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  25  |   });
  26  | 
  27  |   // ── Speed widget ───────────────────────────────────────────────────────────
  28  | 
  29  |   test('speed slider has correct default value', async ({ page }) => {
  30  |     await expect(page.locator('#speed-slider')).toHaveValue('6');
  31  |     await expect(page.locator('#speed-input')).toHaveValue('6');
  32  |   });
  33  | 
  34  |   test('speed slider updates the number input', async ({ page }) => {
  35  |     await page.locator('#speed-slider').fill('50');
  36  |     await expect(page.locator('#speed-input')).toHaveValue('50');
  37  |   });
  38  | 
  39  |   test('speed number input updates the slider', async ({ page }) => {
  40  |     await page.locator('#speed-input').fill('100');
  41  |     await page.locator('#speed-input').dispatchEvent('input');
  42  |     await expect(page.locator('#speed-slider')).toHaveValue('100');
  43  |   });
  44  | 
  45  |   test('speed reset button restores default value', async ({ page }) => {
  46  |     await page.locator('#speed-slider').fill('500');
  47  |     await page.locator('#speed-reset').click();
  48  |     await expect(page.locator('#speed-slider')).toHaveValue('6');
  49  |     await expect(page.locator('#speed-input')).toHaveValue('6');
  50  |   });
  51  | 
  52  |   test('speed copy button is present and enabled', async ({ page }) => {
  53  |     const copyBtn = page.locator('[data-clipboard-target="#speed-pre"]');
  54  |     await expect(copyBtn).toBeVisible();
  55  |     await expect(copyBtn).toBeEnabled();
  56  |   });
  57  | 
  58  |   test('speed code block shows the current value', async ({ page }) => {
  59  |     await expect(page.locator('#speed-pre code')).toContainText('6');
  60  |   });
  61  | 
  62  |   // ── Score widget ───────────────────────────────────────────────────────────
  63  | 
  64  |   test('score input has correct default value', async ({ page }) => {
  65  |     await expect(page.locator('#score-input')).toHaveValue('12345');
  66  |   });
  67  | 
  68  |   test('score input accepts a new value', async ({ page }) => {
  69  |     await page.locator('#score-input').fill('99999');
  70  |     await page.locator('#score-input').dispatchEvent('input');
  71  |     await expect(page.locator('#score-input')).toHaveValue('99999');
  72  |   });
  73  | 
  74  |   test('score reset button restores default value', async ({ page }) => {
  75  |     await page.locator('#score-input').fill('500');
  76  |     await page.locator('#score-input').dispatchEvent('input');
  77  |     await page.locator('#score-reset').click();
  78  |     await expect(page.locator('#score-input')).toHaveValue('12345');
  79  |   });
  80  | 
  81  |   test('score copy button is present and enabled', async ({ page }) => {
  82  |     const copyBtn = page.locator('[data-clipboard-target="#score-pre"]');
  83  |     await expect(copyBtn).toBeVisible();
  84  |     await expect(copyBtn).toBeEnabled();
  85  |   });
  86  | 
  87  |   test('score code block shows the current value', async ({ page }) => {
  88  |     await expect(page.locator('#score-pre code')).toContainText('12345');
  89  |   });
  90  | 
  91  |   // ── Jump velocity widget ───────────────────────────────────────────────────
  92  | 
  93  |   test('jump slider has correct default value', async ({ page }) => {
  94  |     await expect(page.locator('#jump-slider')).toHaveValue('10');
  95  |     await expect(page.locator('#jump-input')).toHaveValue('10');
  96  |   });
  97  | 
  98  |   test('jump slider updates the number input', async ({ page }) => {
  99  |     await page.locator('#jump-slider').fill('25');
  100 |     await expect(page.locator('#jump-input')).toHaveValue('25');
  101 |   });
  102 | 
  103 |   test('jump number input updates the slider', async ({ page }) => {
  104 |     await page.locator('#jump-input').fill('20');
  105 |     await page.locator('#jump-input').dispatchEvent('input');
  106 |     await expect(page.locator('#jump-slider')).toHaveValue('20');
  107 |   });
  108 | 
  109 |   test('jump reset button restores default value', async ({ page }) => {
  110 |     await page.locator('#jump-slider').fill('40');
  111 |     await page.locator('#jump-reset').click();
  112 |     await expect(page.locator('#jump-slider')).toHaveValue('10');
  113 |     await expect(page.locator('#jump-input')).toHaveValue('10');
  114 |   });
  115 | 
  116 |   test('jump copy button is present and enabled', async ({ page }) => {
  117 |     const copyBtn = page.locator('[data-clipboard-target="#jump-pre"]');
  118 |     await expect(copyBtn).toBeVisible();
  119 |     await expect(copyBtn).toBeEnabled();
  120 |   });
  121 | 
  122 |   test('jump code block shows the current value', async ({ page }) => {
  123 |     await expect(page.locator('#jump-pre code')).toContainText('10');
  124 |   });
```