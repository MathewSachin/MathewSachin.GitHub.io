---
title: Creating your own if statement in Kotlin
tags: [kotlin, if]
highlight: true
disqus: true
related:
  - /blog/2023/04/14/dependency-injection-extension-functions-kotlin
  - /blog/2016/11/05/chrome-dino-hack
---

By the nature of how lambdas are written in Kotlin, we can do write our own custom `if` statements.  
Let's start with a simple if-else statement, but in French, so it's a si-sinon statement!

### si-sinon Statement
We want it to look very similar to how if-else looks:
```kotlin
si (someCondition()) {
    println("true branch")
} sinon {
    println("false branch")
}
```

`si` and `sinon` are just functions and the code within braces (`{ }`) are just lambdas. The downside here is that we always need the braces to be used even for single line blocks.
Here's how the `si` and `sinon` functions can be defined:
```kotlin
class IfStatement(private val truth: Boolean) {
    infix fun sinon(onFalse: () -> Unit) {
        if (!truth) onFalse()
    }
}

fun si(truth: Boolean, onTrue: () -> Unit): IfStatement {
    if (truth) onTrue()
    
    return IfStatement(truth)
}
```

### si-sinon Expression
Kotlin if-else statements can also be treated as an expression, wherein you can use the result of an if-else expression like assign it to a variable.
Interestingly, there is no ternary operator in Kotlin, and if-else expression is the alternative.  
Unfortunately, we need to keep the braces :-(.
```kotlin
val result = if (someCondition()) { 5 } else { 10 }
```

The following code makes the above syntax possible:
```kotlin
sealed class IfStatement<out T> {
    class True<T>(val trueValue: T) : IfStatement<T>()
    object False : IfStatement<Nothing>()
}

infix fun <T> IfStatement<T>.sinon(onFalse: () -> T): T =
    when (this) {
        is IfStatement.True -> trueValue
        IfStatement.False -> onFalse()
    }

fun <T> si(truth: Boolean, onTrue: () -> T) =
    if (truth) IfStatement.True(onTrue()) else IfStatement.False
```

### else if (sinon si)
Let's go a bit further and add support for else-if statements that look like:

```kotlin
si (someCondition()) {
    println("true branch")
} sinon si {
    println("another branch")
} sinon {
    println("false branch")
}
```

But, unfortunately, the best I could come up with is:
```kotlin
val x = si (3 < 2) {
    println("true branch")
}.`sinon si` (4 > 3) {
    println("another branch")
} sinon {
    println("false branch")
}
```

using the following code:
```kotlin
sealed class IfStatement<out T> {
    class True<T>(val trueValue: T) : IfStatement<T>()
    object False : IfStatement<Nothing>()
}

infix fun <T> IfStatement<T>.sinon(onFalse: () -> T): T =
    when (this) {
        is IfStatement.True -> trueValue
        IfStatement.False -> onFalse()
    }
    
fun <T> IfStatement<T>.`sinon si`(truth: Boolean, onTrue: () -> T) =
    if (truth) IfStatement.True(onTrue()) else IfStatement.False

fun <T> si(truth: Boolean, onTrue: () -> T) =
    if (truth) IfStatement.True(onTrue()) else IfStatement.False
```
