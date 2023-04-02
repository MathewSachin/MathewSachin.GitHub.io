---
title: WTH is a Pure function
tags: [fp]
highlight: true
---

### WTH is a pure function?
Pure function is a function that produces the same result for identical inputs, and has no side-effects.  
To always produce the same output for the same input, the function shouldn't depend on global or static variables or any form of IO.

```kt
// A pure function that calculates square of a number
fun square(i: Long): Long {
    return i * i
}
```

### What exactly are side-effects?

Side-effects are state changes outside the function like changing global variables, writing to files, making network calls.

**_Referential transparency_**, an unnecessarily complex term :D, is a property of pure functions, where we can replace the function call with just it's result without changing the program's meaning. This works precisely due to the abscense of side-effects.

```kt
println(square(2)) // prints 4
println(4) // replacing the function call with just the output doesn't change the program's meaning
```

### But, without side-effects, how'll my program be useful?
Lorem ipsum

### If side-effects are still needed, why should I write Pure functions?
Lorem ipsum
