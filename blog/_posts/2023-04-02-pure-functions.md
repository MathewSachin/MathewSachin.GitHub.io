---
title: WTH is a Pure function
tags: [fp]
highlight: true
---

### WTH is a pure function?
Pure function is a function that produces the same result for identical inputs, and has no side-effects.  
To always produce the same output for the same input, the function shouldn't depend on global or static variables or any form of IO.

```kotlin
// A pure function that calculates square of a number
fun square(i: Long): Long {
    return i * i
}

// Not a pure function since it reads/writes from/to console.
fun square() {
    val i = readln().toInt()
    val sq = i * i
    println("Square of $i is $sq")
}
```

### What exactly are side-effects?

Side-effects are state changes outside the function like changing global variables, mutating input parameters, writing to files, making network calls.

**_Referential transparency_**, an unnecessarily complex term :D, is a property of pure functions, where we can replace the function call with just it's result without changing the program's meaning. This works precisely due to the abscense of side-effects, because the function only computes and returns the output and doesn't change any external state.

```kotlin
println(square(2)) // prints 4
println(4) // replacing the function call with just the output doesn't change the program's meaning
```

### But, without side-effects, how'll my program be useful?
The idea is not to completely get rid of side-effects, but to extract out as many pure functions as possible from your code. Side-effects like sending a mail, updating a DB, etc. are essentially what we get paid for!

Here's an impure function:
```kotlin
var taxPercent = 30

fun calculateTax(amount: Long): Long {
    return amount * taxPercent / 100
}
```

This function is impure since it refers to a global variable for tax pecent, but could be change to pure by a simple change:

```kotlin
fun calculateTax(amount: Long, taxPercent: Int): Long {
    return amount * taxPercent / 100
}
```

### If side-effects are still needed, why should I write Pure functions?
Pure functions are easy to reason about.
They're also easy to test, and can be tested in isolation since they don't have any side-effects.
