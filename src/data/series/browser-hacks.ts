import type { Series } from './types'

export const browserHacksSeries: Series = {
    name: 'Browser Hacks',
    url: '/blog/series/browser-hacks/',
    description: 'A {count}-part series that takes you from your very first <kbd>F12</kbd> press all the way to writing persistent browser scripts. Every technique builds on the last. Most chapters need nothing but a browser and a curious mind — the final chapter adds Tampermonkey to make your scripts persistent.',
    levels: [
      {
        title: 'Level 1 — Zero Coding Required',
        icon: 'fas fa-seedling',
        intro: "You don't need to know a single line of code to start here. These tricks use the browser's built-in inspector — the same tool professional web developers use every day. Your only job is to press F12 and click.",
        posts: [
          { id: '/blog/2026/03/07/edit-webpage-inspect-element' },
          { id: '/blog/2016/12/07/unhide-password-box' },
          { id: '/blog/2026/03/31/youtube-shorts-normal-player' },
        ],
      },
      {
        title: 'Level 2 — Your First Console Scripts',
        icon: 'fas fa-terminal',
        intro: "Time to open the JavaScript Console and type commands that actually change how a game works. These three posts introduce variables, objects, automation loops, and event simulation — core concepts you will use in every subsequent post.",
        posts: [
          { id: '/blog/2016/11/05/chrome-dino-hack' },
          { id: '/blog/2026/03/07/hacking-wordle' },
          { id: '/blog/2026/03/14/chrome-dino-autoplay' },
        ],
      },
      {
        title: 'Level 3 — Advanced Game Manipulation',
        icon: 'fas fa-chess-knight',
        intro: "You have the basics. Now go deeper. These three posts show you how to override the browser's own built-in functions, build bots that mimic human behaviour convincingly, and exploit intentional backdoors that developers accidentally (or not so accidentally) left inside their own code.",
        posts: [
          { id: '/blog/2026/03/20/hacking-minesweeper-online' },
          { id: '/blog/2026/03/20/hacking-typeracer' },
          { id: '/blog/2026/03/20/cookie-clicker-hacks' },
        ],
      },
      {
        title: 'Level 4 — CSS Injection & Bookmarklets',
        icon: 'fas fa-mobile-alt',
        intro: "Typing into the Console every time gets old fast. Bookmarklets let you save a hack as a browser bookmark and run it with a single tap — even on mobile where DevTools doesn't exist at all. This section also covers CSS injection to change how websites look and feel.",
        posts: [
          { id: '/blog/2026/03/19/brute-force-dark-mode' },
          { id: '/blog/2026/03/19/chrome-dino-hack-mobile-bookmarklet' },
          { id: '/blog/2026/03/19/hacking-wordle-mobile-bookmarklet' },
          { id: '/blog/2026/05/07/remove-popups-bookmarklet' },
          { id: '/blog/2026/04/07/fake-liberal-secret-hitler' }
        ],
      },
      {
        title: 'Level 5 — Network Sniffing & Media Downloading',
        icon: 'fas fa-satellite-dish',
        intro: "Now the serious power moves. These posts show you how to intercept network traffic, inspect the browser's internal data structures, use platform JSON APIs, and ultimately write a fully persistent userscript — a mini browser extension you author yourself. Each platform teaches a different angle of the same underlying skill.",
        posts: [
          { id: '/blog/2026/03/21/save-instagram-photos' },
          { id: '/blog/2026/03/21/instagram-reel-sniper' },
          { id: '/blog/2026/03/21/youtube-shorts-sniper' },
          { id: '/blog/2026/03/21/twitter-x-video-sniper' },
          { id: '/blog/2026/03/22/reddit-video-sniper' },
          { id: '/blog/2026/03/22/instagram-story-sniper' },
          { id: '/blog/2026/03/30/instagram-userscript-download-buttons' },
          { id: '/blog/2026/04/07/hacking-nyt-connections' },
          { id: '/blog/2026/04/08/hacking-nyt-spelling-bee' },
          { id: '/blog/2026/04/08/hacking-nyt-strands' },
          { id: '/blog/2026/04/10/whatsapp-web-devtools-statuses' },
          { id: '/blog/2026/04/10/pinterest-devtools-hacks' },
          { id: '/blog/2026/04/10/quora-devtools-bypass' },
        ],
      },
      {
        title: 'Level 6 — API Interception & Response Spoofing',
        icon: 'fas fa-random',
        intro: 'The final leap: instead of reading what a server sends, you replace it. By monkey-patching window.fetch before the game loads, you intercept outgoing requests mid-flight and hand the game a response you fabricated yourself — the ultimate technique for bending any API-driven browser game to your will.',
        posts: [
          { id: '/blog/2026/04/08/hacking-infinite-craft' },
        ],
      },
    ],
  }
