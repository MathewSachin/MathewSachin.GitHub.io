---
title: What happened to Captura?
tags: [captura]
disqus: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2019/12/07/unhide-password-box
redirect_from:
  - /Captura/
  - /captura/
  - captura
---

### What's Captura?
Captura **was** a screen capture (screenshot, recording) app for Windows which could capture screeen, webcam, audio and keystrokes.
It is no longer maintained, but the [source-code is still archived on GitHub](https://github.com/MathewSachin/Captura) with 8k+ stars and 1.5k+ forks.
I acknowledge the existence of several outstanding bugs in the application, and despite knowing what needs to be addressed, I have decided against providing any further updates.

You can still download it [here](https://github.com/MathewSachin/Captura/releases). Check `Assets` under the version you want and download either the Portable or Setup package.

![Captura](/images/captura.png)

### Some history
In 2015, while I was a high school student, I embarked on a "toy project" to develop a practical application utilizing the C# programming language that I was keenly interested in at that time.
This project was the inception of Captura, a screen capture tool that over time grew to be a significant undertaking, and I aspired to create something of value for others.

As the project was not driven by any commercial motive, I opted to keep it completely ad-free.
However, as multiple generous individuals reached out to support me, I began accepting donations.
The idea of having a community around an open-source project like Captura excited me, and I was inspired by the numerous open-source initiatives in existence.

Although I did not receive many contributions on the coding aspect of the project, I would like to express my gratitude to everyone who aided in localizing Captura into over 20 languages.

### Why it died?
As the sole contributor to Captura, I was struggling with burnout from keeping up with feature development and bug fixes.
Adding to the challenges, I began receiving threatening emails requesting that I remove the source code for the application.

Subsequently, I discovered that certain individuals had stolen the application and were selling it on various platforms, including the Windows Store, under a different name without crediting me as the original developer.
Despite Captura being licensed under the MIT license, which allows for the application to be sold as long as proper attribution is given, these individuals had removed all license information from the application.

Efforts to reach out to Microsoft Store proved to be largely unfruitful for nearly a year, and these circumstances left me feeling overwhelmed.
Eventually, I made the difficult decision to shut down the project completely.
Following this, the Microsoft Store removed the application listing, but by that point, I had already moved on.

### Lessons learnt
After working on Captura for a while, I gradually lost interest in C# and decided to explore other programming languages.
I made a conscious decision to avoid working with C# in the absence of an absolute requirement in any future job opportunities.
In hindsight, I feel that this was a somewhat childish decision, although I have not encountered a scenario in which I needed to use C# in my current employment.

Currently, I am working with Kotlin at my job, and I find it to be a language that I love working with more than C#, so I do not miss working with C#.

Subsequently, I embarked on another open-source project that garnered significant success within a niche audience.
This project was essentially an enhancement of an existing one, with my contribution primarily consisting of major improvements.
Given that the codebase was partially written by someone else, I had fewer concerns about the possibility of others stealing my code.

As of now, due to my full-time job in a major tech company, I have limited time to devote to open-source projects.
If I do decide to contribute to open-source projects, it would likely be in the form of contributions to existing projects rather than creating something new.

If I were to create another major application, it would likely not be open-source, and I would explore monetization options.
After having written code for charity in the past, I am looking to explore opportunities that offer remuneration for my work.

### References
[#405: Illegal Rebrand](https://github.com/MathewSachin/Captura/issues/405)

### Donations
I have decided to take down Captura's website, and henceforth, I will be moving the donations that were previously accepted on the site.
I have not accepted any donations since discontinuing work on the project.
Nonetheless, I would like to extend my gratitude to all the individuals who supported me throughout the journey.

<table class="table table-striped table-bordered shadow">
  {% for donation in site.data.captura_donations %}
    <tr>
      <td>{{ donation.name }}</td>
      <td>{{ donation.amount }}</td>
    </tr>
  {% endfor %}
</table>
