---
layout: page
title: "Browser Hacks: From Zero to Browser Wizard"
description: "An 18-part series that takes you from your very first F12 press to writing persistent userscripts — no installs, no extensions, just your browser."
ads: true
---

<link rel="stylesheet" href="{{ '/styles/blog.css' | relative_url }}">

{%- assign _series = site.data.series["browser-hacks"] -%}

<p class="lead mt-2 mb-4">{{ _series.description }}</p>

{%- assign _part_counter = 0 -%}
{%- for _level in _series.levels -%}

---

<p class="series-level-heading"><i class="{{ _level.icon }} me-1" aria-hidden="true"></i>{{ _level.title }}</p>

<p>{{ _level.intro }}</p>

{%- for _entry in _level.posts -%}
  {%- assign _part_counter = _part_counter | plus: 1 -%}
  {%- assign _post = site.posts | where: "id", _entry.id | first -%}
  {%- if _post -%}
<a href="{{ _post.url | relative_url }}" class="series-post-item">
  <span class="series-part-badge">{{ _part_counter }}</span>
  <div>
    <div class="series-post-title">{% if _post.icon %}<i class="{{ _post.icon }} post-icon me-1" aria-hidden="true"></i>{% endif %}{{ _post.title }}</div>
    <small class="text-muted">{{ _entry.blurb }}</small>
  </div>
</a>
  {%- endif -%}
{%- endfor -%}
{%- endfor -%}

---

<p class="text-muted small mt-3">
  <i class="fas fa-info-circle me-1" aria-hidden="true"></i>
  All hacks in this series run directly in your browser — no software to install, no accounts to create.
  Techniques are for educational purposes; always respect a site's Terms of Service.
</p>
