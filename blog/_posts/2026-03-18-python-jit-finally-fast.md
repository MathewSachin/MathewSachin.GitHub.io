---
title: "Python's JIT Is Finally Fast — And It Almost Didn't Happen"
tags: [python, performance, jit, open-source, compilers]
highlight: true
related:
  - /blog/2026/03/09/luddites-vs-developers
  - /blog/2026/03/13/nature-vibe-coded-us
  - /blog/2023/04/02/pure-functions
---

*For years, the honest answer to "is Python's JIT any good?" was "not really." That changed yesterday.*

On March 17, 2026, CPython core contributor Ken Jin posted an update that's been quietly anticipated by the Python performance community for over a year: [the Python 3.15 JIT is back on track](https://fidget-spinner.github.io/posts/jit-on-track.html). The 3.15 alpha is now **11–12% faster than the tail-calling interpreter on macOS AArch64** and **5–6% faster on x86_64 Linux** — hitting the team's target goals for 3.15 over a year ahead of schedule.

That sounds modest. But context matters a lot here, because it was not supposed to go this way at all.

## The JIT That Made Python Slower

Python 3.13 shipped a JIT. [The community was excited.](https://peps.python.org/pep-0744/) Then the benchmarks came in.

The original copy-and-patch JIT — the one that shipped in 3.13 and 3.14 — was **often slower** than the standard interpreter. Not marginally slower. Routinely slower on real workloads. Ken Jin himself documented this awkward reality in a [JIT reflections post](https://fidget-spinner.github.io/posts/jit-reflections.html) eight months ago. The JIT existed, it compiled, it ran — and it made Python sluggish.

This isn't unusual in JIT history. Java's HotSpot JIT famously spent its early life being slower than the interpreted path for most programs. LuaJIT took years of iteration to become the phenomenally fast runtime it is. Building a JIT that's reliably faster than a well-tuned interpreter is genuinely hard, and Python's interpreter had been carefully optimised over decades.

## Then the Funding Dried Up

The situation became more precarious in 2025 when the Faster CPython team — the group inside Microsoft responsible for the aggressive performance work that had defined Python 3.11, 3.12, 3.13, and 3.14 — lost its main sponsor funding.

Some of the team moved on. Others were directly affected by the Microsoft layoffs that had become a recurring theme through that year. The JIT, already struggling to deliver on its promise, suddenly had fewer paid engineers behind it.

Ken Jin is a volunteer. His funding was not affected. But that cut another way: the people whose salaries depended on Python being faster were no longer there. The people left were there because they wanted to be — which, it turns out, is its own kind of motivation.

## What the Community Did Next

Rather than quietly winding down the JIT work, Ken Jin went to the Python community directly. He [raised the idea of community stewardship](https://discuss.python.org/t/community-stewardship-of-faster-cpython/92153) for the Faster CPython work and wrote a [detailed plan](https://fidget-spinner.github.io/posts/faster-jit-plan.html) with concrete, modest targets: a 5% speedup by 3.15 and a 10% speedup by 3.16.

The plan worked, partly through deliberate community architecture. Instead of keeping the JIT as an opaque blob that only a handful of experts could contribute to, the team deliberately broke the work into small, approachable tasks:

> "I laid out very detailed instructions that were immediately actionable. I also clearly demarcated units of work. I suspect that did help, as we have 11 contributors working on that issue."

The trick was making one specific optimisation — converting interpreter instructions to a more JIT-optimizer-friendly form — into something a C programmer with no JIT experience could contribute to. Clear tasks, clear outcomes, visible progress.

<div class="alert alert-info">
  🚌 <b>Bus factor:</b> One of the explicit goals was to reduce the project's bus factor — the number of people who, if they disappeared, would kill the project. Going from 2 active contributors in the middle-end to 4 wasn't glamorous work, but it was arguably more important than any individual optimisation.
</div>

## The Two Lucky Bets

Beyond the community work, there were two technical bets that made the numbers move.

### Trace recording

The JIT was originally a "copy-and-patch" design: it would copy bytecode stencils and patch in concrete values. It worked, but it couldn't see across the boundaries between instructions — which is where a lot of the interesting optimisation opportunities live.

At the CPython core sprint in Cambridge, Brandt Bucher nerd-sniped Ken Jin into rewriting the JIT frontend to use **trace recording** — following execution paths across bytecodes rather than compiling them in isolation. The initial prototype took three days. Getting it to pass the test suite took a month. The first benchmark results were terrible: 6% *slower*.

Then a misunderstanding turned into a breakthrough. Mark Shannon suggested threading the dispatch table through the interpreter. Ken Jin misread the suggestion and implemented something more radical: a single instruction responsible for all tracing, with all interpreter instructions pointing to it via a second dispatch table. He calls it **dual dispatch**.

The result: trace recording coverage jumped 50%. Every future optimisation became 50% more effective, because the JIT was now seeing — and compiling — far more of the hot path.

### Reference count elimination

Python's memory model is built on reference counting. Every time a variable is assigned or a function returns, Python increments or decrements a counter, and when that counter hits zero, the memory is freed. For CPython this means every single Python instruction involves at least one reference count operation — and every reference count decrement needs a branch to check if the count hit zero.

Inside the JIT, those branches were still there. Ken Jin noticed them and asked a simple question: what if we just eliminate them where the JIT can prove they're unnecessary?

The answer was: it helps a lot. One branch per instruction adds up. And unlike the trace recording rewrite, reference count elimination was something you could teach a new contributor in an afternoon. It was regular, parallelisable, and instructive. The team handed it to their community contributors and watched the numbers climb.

## The Numbers, Placed in Context

The current results for the 3.15 alpha JIT:

| Platform | JIT vs tail-calling interpreter |
|---|---|
| macOS AArch64 | **11–12% faster** |
| x86_64 Linux | **5–6% faster** |

The range across benchmarks is wide — from a 20% slowdown on some microbenchmarks to over 100% speedup on others. The geometric mean hides real variance. But hitting the 3.15 target, months early, after the years-long slog of a JIT that made things slower — that's a genuine milestone.

Free-threading support is still pending, targeted for 3.15 or 3.16. That's where things get more interesting: a JIT that can efficiently schedule work across multiple cores, without the GIL, would be a meaningfully different Python runtime from what exists today.

## What the Community Is Saying

Hacker News got hold of the post and the [discussion](https://news.ycombinator.com/item?id=47416486) has been lively. A few threads worth picking out:

**On whether the JIT goes far enough:**

> "Python really needs to take the Typescript approach of 'all valid Python4 is valid Python3'. And then add value types so we can have int64 etc. And allow object refs to be frozen after instantiation to avoid the indirection tax. Sensible type-annotated python code could be so much faster if it didn't have to assume everything could change at any time."

This view surfaces regularly: the JIT is chasing headroom that fundamental Python semantics keep shrinking. Python's dynamism — `__del__`, monkey-patching, the C extension API — all create escape hatches the JIT has to account for. The commenter's point is that the performance ceiling for a dynamically-typed Python is inherently lower than it could be with optional type constraints.

**On the Python 2→3 parallel:**

The thread detoured into a familiar grievance — whether the Python 2→3 transition was a disaster. The two camps hardened quickly:

> "I cannot believe people are still acting like Python 2→3 was a huge fuck-up and an enormous missed opportunity. When in reality Python is by most measures the most popular language and became so AFTER that switch."

vs.

> "It took a long time for Python 3 to add the necessary backwards compatibility features to allow people to switch over. Once they did it was fine, but it was a massive fuck up until then. The migration took far longer than it should have done. It's widely regarded as a disaster for good reason."

Both are true, sort of. Python 3 made the right long-term choices. The transition was, by any fair reading, badly managed. That it turned out fine doesn't retroactively make the decade of ecosystem fragmentation pleasant.

**On the community-funded open source angle:**

A quieter theme in the thread was appreciation for the community stewardship model itself. A project with no commercial sponsor, run by volunteers, hitting performance targets a year early — that's not a common outcome. The explicit work to lower the bus factor, break work into teachable chunks, and celebrate small wins looks, from the outside, like a template worth studying.

## Why This Matters Beyond Python

The Python JIT story is also a story about what happens when big-company funding for a high-profile open source project disappears mid-stream.

The pattern is becoming familiar: a large company funds a team to work on an open source project, the team makes real progress, the funding gets cut (for reasons unrelated to the project's quality or importance), and the community is left to pick up the pieces. Sometimes the project quietly dies. Sometimes, if the community infrastructure is in place and the remaining contributors are motivated, it survives and even accelerates.

The Python JIT survived. The question of whether that's replicable — whether other projects in similar positions would have the same luck — is uncomfortable. The answer probably involves luck as much as structure.

<div class="alert alert-info">
  🐍 <b>Try the 3.15 alpha:</b> If you want to test the JIT on your own workloads, the alpha builds are available at <a href="https://www.python.org/downloads/pre-releases/">python.org/downloads/pre-releases</a>. Enable the JIT with <code>--enable-experimental-jit</code> when building from source, or look for community-built binaries. Results will vary widely by workload — microbenchmarks are not representative.
</div>

## The Longer Arc

Python 3.11 gave us a 10–60% speedup, the biggest single-version performance jump in the language's history. Python 3.12 and 3.13 continued in the same direction. Then 3.14's JIT turned out to be a step backward, and the team lost its funding.

Now, eight months after that low point, Python 3.15 is on track to deliver a JIT that is meaningfully faster than no JIT at all — and the groundwork is being laid for free-threading support that could make CPython competitive for the kinds of parallel workloads it currently hands off to multiprocessing.

That's not the dramatic acceleration some people hoped for. Python is still not going to beat Go at raw throughput, and it's not going to close the gap with Rust on compute-intensive work. But it is getting faster, it's doing so sustainably, and the people doing the work are doing it because they want to.

That's worth something.

*What Python workloads would you want to benchmark against the 3.15 JIT? And if you've contributed to CPython — or want to — the JIT team has made it [genuinely approachable](https://github.com/python/cpython/issues/134584). Drop a comment below. 👇*

---

*This post was generated with the assistance of AI as part of an [automated blogging experiment]({% post_url /blog/2026-03-12-ai-blog-generation-flow %}). The research, curation, and editorial choices were made by an AI agent; any errors are its own.*
