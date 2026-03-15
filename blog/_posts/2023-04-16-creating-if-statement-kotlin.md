---
title: Creating your own if statement in Kotlin
tags: [kotlin, if]
highlight: true
related:
  - /blog/2023/04/14/dependency-injection-extension-functions-kotlin
  - /blog/2023/04/02/pure-functions
---

Kotlin's lambda syntax is expressive enough that you can craft your own control-flow constructs that look and feel like built-in language keywords.
In this post, we'll build a custom `if`-`else` construct step by step — in French, so it becomes a `si`-`sinon` statement!

## si-sinon Statement

Let's aim for syntax that closely mirrors the standard Kotlin `if`-`else`:

```kotlin
si (someCondition()) {
    println("true branch")
} sinon {
    println("false branch")
}
```

Here, `si` and `sinon` are just regular functions, and the blocks inside the braces (`{ }`) are trailing lambdas.
One trade-off compared to a true `if` statement is that the braces are always required — even for single-line branches — because Kotlin's lambda syntax demands them.

The implementation is surprisingly simple:

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

`si` executes `onTrue` if the condition holds and returns an `IfStatement` object that carries the result.
The `sinon` infix function on that object then executes `onFalse` only when the condition was `false`.
The `infix` modifier on `sinon` lets us drop the dot and parentheses, making it read naturally as `} sinon {`.

## si-sinon Expression

In Kotlin, `if`-`else` can also be used as an expression — you can assign its result to a variable.
This is Kotlin's answer to the ternary operator found in languages like Java or C:

```kotlin
val result = if (someCondition()) { 5 } else { 10 }
```

We can build the same capability into our `si`-`sinon` construct.
The key challenge is that `si` must capture the value returned by `onTrue` and hand it off to `sinon`, which either returns that value (when the condition was true) or evaluates `onFalse` and returns its value instead.

We model this with a sealed class that represents the two possible outcomes:

```kotlin
sealed class IfStatement<out T> {
    class True<T>(val trueValue: T) : IfStatement<T>()
    object False : IfStatement<Nothing>()
}

fun <T> si(truth: Boolean, onTrue: () -> T) =
    if (truth) IfStatement.True(onTrue()) else IfStatement.False

infix fun <T> IfStatement<T>.sinon(onFalse: () -> T): T =
    when (this) {
        is IfStatement.True -> trueValue
        IfStatement.False -> onFalse()
    }
```

`si` returns `IfStatement.True` wrapping the computed value when the condition holds, or `IfStatement.False` when it doesn't.
`sinon` then unwraps the true value or evaluates the false branch, producing the final result of the whole expression.

## else if (sinon si)

Real-world control flow often needs more than two branches.
Let's extend the construct to support chained `else if` — or in our case, `sinon si`:

```kotlin
si (someCondition()) {
    println("true branch")
} sinon si (anotherCondition()) {
    println("another branch")
} sinon {
    println("false branch")
}
```

The trick is to add a second overload of `sinon` that accepts an `IfStatement` instead of a lambda.
When the first `si` already matched (its result is `True`), that overload short-circuits and propagates the `True` result, skipping all subsequent branches.
If it was `False`, the next `si` is evaluated and its result becomes the new `IfStatement` to chain from.

```kotlin
sealed class IfStatement<out T> {
    class True<T>(val trueValue: T) : IfStatement<T>()
    object False : IfStatement<Nothing>()
}

fun <T> si(truth: Boolean, onTrue: () -> T): IfStatement<T> =
    if (truth) IfStatement.True(onTrue()) else IfStatement.False

infix fun <T> IfStatement<T>.sinon(onFalse: () -> T): T =
    when (this) {
        is IfStatement.True -> trueValue
        IfStatement.False -> onFalse()
    }

infix fun <T> IfStatement<T>.sinon(ifStatement: IfStatement<T>): IfStatement<T> =
    when (this) {
        is IfStatement.True -> this
        IfStatement.False -> ifStatement
    }
```

The two `sinon` overloads work together: the one accepting a lambda terminates the chain with a final value, while the one accepting an `IfStatement` continues it — mirroring how `else` terminates a chain of `else if` clauses in standard Kotlin.

## Conclusion

Kotlin's combination of infix functions, trailing lambdas, and sealed classes gives you the building blocks to create expressive, readable DSL-style control flow.
While you'd rarely replace a plain `if`-`else` in production code, this exercise highlights how flexible Kotlin's syntax really is.
The lambda blocks here work best when kept [pure]({% post_url /blog/2023-04-02-pure-functions %}) — side-effect-free functions that only compute their result — making the construct easy to reason about and test.

Thanks for reading! Have fun!
