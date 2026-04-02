---
layout: series
title: "Blogging with Jekyll"
description: "A 6-part series on building and running a Jekyll blog hosted on GitHub Pages — from automating posts with AI to adding offline search, comments, live PR previews, ads, and faster CI builds."
ads: true
---


{%- assign _series = site.data.series["blogging-with-jekyll"] -%}

<p class="lead mt-2 mb-4">{{ _series.description }}</p>

{%- assign _part_counter = 0 -%}
{%- for _level in _series.levels -%}

---

<h2 class="series-level-heading" id="level-{{ forloop.index }}"><i class="{{ _level.icon }} me-1" aria-hidden="true"></i>{{ _level.title }}</h2>

<p>{{ _level.intro }}</p>

{%- for _entry in _level.posts -%}
  {%- assign _part_counter = _part_counter | plus: 1 -%}
  {%- assign _post = site.posts | where: "id", _entry.id | first -%}
  {%- if _post %}
<div class="series-post-item">
  <span class="series-part-badge">{{ _part_counter }}</span>
  <div>
    <a href="{{ _post.url | relative_url }}" class="series-post-title">{% if _post.icon %}<i class="{{ _post.icon }} post-icon me-1" aria-hidden="true"></i>{% endif %}{{ _post.title }}</a>
    <br><small class="text-muted">{{ _entry.blurb }}</small>
  </div>
</div>
  {%- endif -%}
{%- endfor -%}
{%- endfor -%}
