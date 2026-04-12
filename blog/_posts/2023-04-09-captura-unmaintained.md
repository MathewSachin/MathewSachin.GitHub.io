---
title: What happened to Captura?
icon: "fas fa-camera"
tags: [captura]
related:
  - /blog/2017/07/28/ffmpeg-pipe-csharp
  - /blog/2017/07/28/mixing-audio
  - /blog/2026/03/12/fate-grand-automata-developer-guide
---

## What's Captura?
Captura **was** a screen capture (screenshot, recording) app for Windows which could capture screen, webcam, audio and keystrokes.
It is no longer maintained, but the [source-code is still archived on GitHub](https://github.com/MathewSachin/Captura) with 8k+ stars and 1.5k+ forks.

<div><a href="{{ '/tools/captura/' | relative_url }}" class="inline-tool-card-link">
  <div class="card inline-tool-card">
    <div class="card-body d-flex align-items-center gap-3">
      <i class="fas fa-video fa-2x flex-shrink-0"></i>
      <div>
        <div class="fw-bold">Captura Web Recorder</div>
        <div class="small mt-1">Record your screen in the browser — no installation needed.</div>
      </div>
      <i class="fas fa-arrow-right ms-auto flex-shrink-0"></i>
    </div>
  </div>
</a></div>

## Status / TL;DR
- **Maintained?** No. Development stopped around 2019.
- **Download:** Releases are still available [on GitHub](https://github.com/MathewSachin/Captura/releases). In the `Assets` section of the release you want, download either the Portable or Setup package.
- **Support:** No bug fixes, feature requests, or security patches will be issued.
- **Safety:** Captura has not received updates in several years. Use it at your own risk, especially on sensitive systems or newer versions of Windows.

{% picture captura.png alt="Captura" %}

## Some history
In 2015, while I was a high school student, I started Captura as a "toy project" — a practical way to learn C#.
Over time it grew into something much larger: a full-featured screen capture tool that attracted a community and over 20 language translations.
As it was not driven by any commercial motive, I kept it completely ad-free, though I later began accepting donations from generous users.

## Timeline
- **2015** — Project started as a personal learning exercise in C#.
- **2016–2018** — Significant growth; community translations, user donations, and active feature development.
- **2018–2019** — Burnout set in; unauthorized rebrands appeared on the Windows Store, violating the MIT license attribution requirement.
- **~2019** — Project archived; development stopped.
- **2023** — This post written to document the history.

## Why I stopped maintaining it
As the sole contributor, I was struggling with burnout from balancing feature development and bug fixes.
I also started receiving threatening emails demanding that I remove the source code.

Around the same time, I discovered that individuals had taken the application, stripped out all license information, and were selling it on platforms including the Windows Store under a different name — without crediting me.
The MIT license permits selling the application, but it **requires that the original license notice and attribution be retained**.
Removing that information is a violation of the license terms (see [#405: Illegal Rebrand](https://github.com/MathewSachin/Captura/issues/405)).

Efforts to get the Microsoft Store to remove these listings took nearly a year and left me feeling overwhelmed.
Eventually, I shut down the project. The infringing listings were later removed, but by that point I had already moved on.

## Safety & expectations
Captura has not received any updates since approximately 2019. What this means in practice:

- **No bug fixes** — known issues will not be resolved.
- **No new features** — the application is feature-frozen.
- **No security patches** — vulnerabilities discovered after 2019 will not be fixed.
- **Compatibility** — Captura may not work correctly on newer versions of Windows.

If it still meets your needs for light, non-sensitive use, feel free to continue using it.
For anything involving sensitive content or a production environment, consider a maintained alternative.

## Alternatives
A few well-known tools for common use cases:

- **Screen recording (browser):** [Captura Web Recorder]({{ '/tools/captura/' | relative_url }}) — a spiritual successor to Captura that runs entirely in Chrome with no installation required.
- **Screen recording:** [OBS Studio](https://obsproject.com/) — free, open-source, Windows / macOS / Linux.
- **Screenshots & recording:** [ShareX](https://getsharex.com/) — free, open-source, Windows.
- **GIF capture:** [ScreenToGif](https://www.screentogif.com/) — free, open-source, Windows.

## Lessons learned
- **Burnout is real in solo open-source projects.** Without a co-maintainer or clear scope boundaries, the maintenance load compounds quickly.
- **License enforcement is hard.** MIT is permissive, but attribution requirements are routinely ignored, and platforms like the Microsoft Store are slow to act on violations.
- **Language enthusiasm alone doesn't sustain a project.** My interest in C# faded; had I built Captura in a language I still use today, I might have maintained it longer.
- **Monetization is worth thinking about upfront.** Writing code for free is rewarding early on, but sustainable projects often need a funding model. After this experience, I would explore monetization options before starting something new.
- I have since worked on [another open-source project]({% post_url /blog/2026-3-12-fate-grand-automata-developer-guide %}) with a narrower scope and a different community dynamic — and found it far less draining. My current full-time role at a major tech company leaves limited time for open source, so any future contributions would more likely be to existing projects than to new ones I create.

## References
[#405: Illegal Rebrand](https://github.com/MathewSachin/Captura/issues/405)

## Donations
The table below lists donations received while Captura was active.
I have not accepted any donations since discontinuing the project, and I am grateful to everyone who supported Captura during its run.

<table class="table table-striped table-bordered shadow">
  {% for donation in site.data.captura_donations %}
    <tr>
      <td>{{ donation.name }}</td>
      <td>{{ donation.amount }}</td>
    </tr>
  {% endfor %}
</table>
