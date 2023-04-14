---
title: Dependency Injection of extension functions in Kotlin
tags: [di, extensions, functions, kotlin]
highlight: true
disqus: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2023/04/09/captura-unmaintained
---

### Pre-requisites

**Extension functions** in Kotlin allow you to add new functions to existing classes without having to inherit from them.
```
fun Double.cube() = this * this * this
```

**Dependency injection** is a design pattern in which the dependencies of an object are provided externally rather than being created within the object itself.
Knowing about dependency injection is a pre-requisite to this post.
```
class Car {
    // Engine created within Car. Always locked to Petrol engine
    private val engine = PetrolEngine()
    
    fun start() = engine.start()
}

// Injects Engine interface, can work with any Engine
class Car @Inject constructor(val engine: Engine) {
    fun start() = engine.start()
}
```


### What is this post about?
Extension functions make the code more idiomatic, but are very similar to static functions.
Hence, techniques like dependency injection and mocking don't play well with these.
So, usually the recommendation is to [keep these functions pure]({% post_url /blog/2023-04-02-pure-functions %}), basically only rely on inputs to produce output, don't cause side-effects.
This is so that we can reason about and test these function easily in isolation without needing dependency injection or mocking.

But, there are some niche situations where using extensions functions would make the code more readable.
What I'm going to show you is a way to achieve just that while still being able to inject dependencies.

The use-case I had for this was a game-automation scripting framework in which the main mode of operation was to match images on the screen and then click on the screen.  
For these scripts, having simple extension functions felt very intuitive compare to calling regular functions.

```
fun Region.click()
operator fun Region.contains(image: Image)
fun Region.findMatch(image: Image): Match
fun Region.findAllMatches(image: Image): List<Match>
```

### Let's start
To enable dependency injection, I made use of the fact that Kotlin allows to define extension functions even on interfaces.
So, let's move all these functions to an interface. You could also use multiple interfaces to group related functions.

```kotlin
interface ScriptApi {
    fun Region.click()
    operator fun Region.contains(image: Image)
    fun Region.findMatch(image: Image): Match
    fun Region.findAllMatches(image: Image): List<Match>
}
```

Now, let's impelement this interface. In this implementation, inject whatever dependencies you want.
For this example, that's the interfaces for clicking and image matching.

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

In the class where you want to use these extension functions, inject the interface that we defined above.
Sprinkle in some magic with Kotlin delegation, i.e. use the injected interface to make the target class implement the same interface.

That probably sounded confusing :D. Look at the `: ScriptApi by api` in the example below.
What it basically tells Kotlin is that, call this other object for the functions/properties in this interface.

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

### Testing
There you have it! Now you can provide a mock interface while testing to test your extension functions in isolation!
I usually like to have minimal detail in the extension impelementation class and move the impure logic to other interfaces that I could mock out. In the above example, that's `Clicker` and `ImageMatcher`.
Following example uses Mockito kotlin and JUnit 5:

```
@Test
fun `should attack when an enemy is spotted`() {
  val mockClicker = mock<Clicker> {
      // No-op on click
      doNothing().whenever(it).click(ATTACK_BUTTON)
  }

  val mockImageMatcher = mock<ImageMatcher> {
      // Enemy always present
      on { it.matches(ENEMY_IMAGE, ENEMY_REGION)) } doReturn true
  }

  val testBattle = BattleScript(ScriptApiImplementation(mockClicker, mockImageMatcher))
  testBattle.battle()
  
  // Verify attacked once
  verify(mockClicker, times(1)).click(ATTACK_BUTTON)
}
```

### Conclusion

While this post showed you a possiblity of using dependency-injection with extension functions, carefully evaluate if this fits your use-case, before using this practically, and also if the extension functions really improve readability of your code by a significant amount.

Thanks for reading! Have fun!
