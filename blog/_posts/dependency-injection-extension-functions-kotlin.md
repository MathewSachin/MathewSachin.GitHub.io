---
title: Dependency Injection of extension functions in Kotlin
tags: [di, extensions, functions, kotlin]
highlight: true
disqus: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2023/04/09/captura-unmaintained
---

**Discalimer:** What I'm going to show here is not something people usually do. If you do decide to use it, use in moderation, don't overdo.

```kotlin
interface ScriptApi {
    fun Region.click()
    operator fun Region.contains(image: Image)
    fun Region.findMatch(image: Image): Match
    fun Region.findAllMatches(image: Image): List<Match>
}
```

```kotlin
class ScriptApiImplementation @Inject constructor(
    private val clicker: Clicker,
    private val imageMatcher: ImageMatcher
) : LocationExtensions {
    override fun Region.click() = clicker.click(this)
    override operator fun Region.contains(image: Image) = imageMatcher.matches(image, region)
    override fun Region.findMatch(image: Image): Match = imageMatcher.find(image, region)
    override fun Region.findAllMatches(image: Image): List<Match> = imageMatcher.findAll(image, region)
}
```

```kotlin
class BattleScript @Inject constructor(
    api: ScriptApi
) : ScriptApi by api {
    val ENEMY_IMAGE: Image = //...
    val ENEMY_REGION: Region = //...
    val ATTCK_BUTTON: Location = //...

    fun battle() {
        if (ENEMY_IMAGE in ENEMY_REGION) { // or ENEMY_REGION.contains(ENEMY_IMAGE)
            ATTACK_BUTTON.click()
        }
    }
}
```
