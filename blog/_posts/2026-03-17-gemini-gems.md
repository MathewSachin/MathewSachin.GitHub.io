---
title: "Gemini Gems: Build a Custom AI That Actually Knows Your Stuff"
icon: "fas fa-gem"
tags: [ai, gemini, google, productivity, customization]
highlight: true
related:
  - /blog/2026/03/12/ai-blog-generation-flow
  - /blog/2026/03/13/nature-vibe-coded-us
  - /blog/2026/03/09/luddites-vs-developers
---

*Every time you start a new chat with an AI assistant, you spend the first five minutes re-explaining who you are, what you're working on, and what tone you want. There's a better way.*

<img alt="Gemini app mockup showing a sidebar of custom Gems like Code Reviewer, Blog Writer, and Data Analyst, with a chat area demonstrating context-aware responses without any preamble" src="/images/gemini-gems-hero.svg" width="560" style="display:block;margin:1rem auto;">

## What Is a Gemini Gem?

A **Gem** is a custom AI persona you create inside [Google Gemini](https://gemini.google.com). Think of it as a version of Gemini that has already been briefed — on your domain, your style, your goals, and your preferred way of getting answers.

You define the Gem once. From that point on, every conversation you have with it starts from that shared context. No preamble, no recapping, no "please respond in bullet points" at the top of every prompt.

Google ships a handful of pre-built Gems by default — a brainstorming partner, a coding assistant, a writing editor — but the real power is in the ones you create yourself.

## How Gems Are Different from Just Prompting

When you open a standard Gemini chat, the model has no memory of what you've done before. Each session is a blank slate. Experienced users compensate by writing long system-prompt preambles, pasting in context blocks, or maintaining a personal "prompt library" they copy from.

Gems make that permanent. They act like a saved system instruction that is silently prepended to every message you send, setting the model's behaviour, tone, domain knowledge, and constraints before you've typed a single word.

| Approach | Persistent? | Reusable? | Shareable? |
|---|---|---|---|
| Manual pasting in each chat | No | With effort | Copy-paste only |
| Chat history (extensions) | Limited | No | No |
| Gemini Gem | Yes | One click | Yes (with a link) |

The difference shows up fast when you're doing repetitive work — code reviews, weekly summaries, customer response drafts, research digests — anything where the framing and style stays the same even as the content changes.

## Creating Your First Gem

Creating a Gem takes about three minutes. Here's how:

1. Open [gemini.google.com](https://gemini.google.com) and sign in with your Google account.
2. In the left sidebar, find **Gems** and click **Gem manager**.
3. Click **New Gem** (the `+` button in the top right).
4. Give it a name — something descriptive, like "Python Code Reviewer" or "Weekly Newsletter Editor".
5. In the **Instructions** box, write what this Gem should do.
6. Optionally, upload files that give it reference material (style guides, templates, domain glossaries).
7. Hit **Save**, and you're done.

The instructions field is where the magic happens. Here's an example for a developer writing a code review Gem:

```
You are a senior Python engineer performing code reviews. 
When I paste code, do the following:
- Identify logic bugs, edge cases, and missing error handling
- Note any violations of PEP 8 style guidelines
- Suggest improvements to readability or structure
- Keep feedback concise: use bullet points, not paragraphs
- Do not praise code; focus only on what can be improved

Assume the codebase targets Python 3.11+.
```

That's it. Every time you start a conversation with this Gem and paste in a function, you get a focused, opinionated review — without having to write that brief every single time.

<div class="alert alert-info">
  📁 <b>Tip:</b> You can upload files to give your Gem reference material. Paste in a coding style guide, a brand voice document, or a glossary of terms specific to your domain. The Gem will treat these as ground truth when responding.
</div>

## What Makes a Good Gem

Not all Gems are equally useful. The quality of the output tracks closely with the quality of the instructions.

### Be specific about the task

Vague: *"Help me write better."*

Specific: *"You are an editor for a B2B SaaS blog. When I paste a draft, shorten sentences over 25 words, replace jargon with plain English, and ensure each paragraph has a clear topic sentence. Output the revised text, then list the changes you made."*

### Constrain the format

If you always want bullet points, say so. If you want the response to include a summary at the top, specify it. The more you define the output shape, the less time you spend reformatting responses.

### Set the persona

Giving the Gem a character — "you are a sceptical product manager", "you are a patient Python tutor" — shifts not just the tone but the way it frames problems. A sceptical PM will push back on assumptions. A patient tutor will explain before diving into code.

### Tell it what *not* to do

This is often more powerful than the positive instructions. "Do not suggest tools outside the ones already in use." "Do not repeat the question back to me." "Do not use the phrase 'Certainly!' or 'Great question!'" Small exclusions produce noticeably better output.

<div class="alert alert-info">
  🧪 <b>Testing your Gem:</b> After saving, send it a few representative inputs and see whether the output matches your expectations. Refine the instructions iteratively — treat it like debugging, not a one-shot prompt.
</div>

## Practical Gem Ideas

Here are some Gems worth building if you haven't already:

| Gem name | What it does |
|---|---|
| **Commit message writer** | Turns a git diff or bullet-point summary into a conventional commit message |
| **Meeting notes summarizer** | Converts messy meeting transcript into decisions, action items, and owners |
| **Email tone adjuster** | Takes a draft email and rewrites it as formal, neutral, or casual |
| **Interview prep coach** | Asks behavioural questions based on a job description you paste in |
| **Budget reviewer** | Reviews monthly spending summaries and flags anomalies or savings opportunities |
| **Changelog drafter** | Converts a list of merged PRs or tickets into user-facing changelog entries |

The best Gems tend to be narrow. A Gem that does one job with precision beats a catch-all assistant every time.

## Sharing a Gem

If you're working with a team, Gems can be shared. From the Gem manager, copy the share link and send it to anyone with a Gemini account. They get the same instructions and uploaded files you set up — a ready-made tool, not a blank slate.

This is useful for teams that want consistent AI output: shared review templates, consistent onboarding materials, standardised customer response tone. One person sets it up; everyone benefits.

## Limitations Worth Knowing

Gems are powerful, but they have real constraints:

- **Context window cap.** Uploaded files and long instruction blocks consume context space. Very large reference documents may be partially ignored.
- **No long-term memory between sessions.** The Gem's instructions persist, but facts you told it in a previous conversation don't. It won't remember that you "last week mentioned the Q3 deadline was moved."
- **Instructions are not strictly enforced.** If you ask the Gem something outside its instructions, it will usually comply rather than refusing. Think of the instructions as a strong default, not an unbreakable rule.

## Alternatives to Gemini Gems

Gems are not the only way to build a persistent custom AI persona:

| Platform | Feature | Key difference |
|---|---|---|
| **ChatGPT** | Custom GPTs | More powerful, supports actions and API calls; requires ChatGPT Plus |
| **Claude** | Projects | Stores conversation history across sessions; tighter context management |
| **Copilot** | Copilot Pages + custom instructions | Deep integration with Microsoft 365 apps |
| **Poe** | Custom bots | Multi-model; lets you build on top of Claude, GPT, and others |
| **Open-source (LM Studio, Ollama)** | System prompts | Full control, runs locally, no subscription required |

If you're already in the Google ecosystem — Workspace, Drive, Meet — Gems integrate naturally. If you spend most of your time in VS Code or GitHub, a Copilot or ChatGPT custom GPT might fit better. If privacy and local control matter most, a local model with a saved system prompt does the same job without sending data anywhere.

## The Deeper Principle

Gems are really just a UI wrapper around a persistent system prompt. But the wrapper matters, because friction matters.

The difference between a tool you actually use and one you forget about is often not capability — it's one or two extra steps. Gems reduce the steps. They make the right context available by default, so you spend your energy on the actual problem, not on re-establishing the setting every time.

Build one Gem for the task you do most repetitively. Use it for a week. You'll be surprised how quickly the briefing overhead disappears.

<div class="alert alert-info">
  🪨 <b>Start small:</b> Don't try to build the perfect all-knowing assistant. Pick the one task where you find yourself writing the same opening lines every time you open a chat. Turn that into a Gem. That's it.
</div>

*Which task in your daily work could use a Gem? If you've already built one, what instruction made the biggest difference? Drop a note in the comments — the best Gem ideas come from people solving real, specific problems. 👇*
