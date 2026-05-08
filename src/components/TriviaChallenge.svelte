<script lang="ts">
  import { onMount } from 'svelte';

  interface Question {
    question: string;
    options: string[];
    answer: number; // index of correct option
  }

  let {
    questions,
    storageKey = '',
  }: {
    questions: Question[];
    storageKey?: string;
  } = $props();

  let current = $state(0);
  let selected = $state<number | null>(null);
  let confirmed = $state(false);
  let correctCount = $state(0);
  let finished = $state(false);
  let highScore = $state<number | null>(null);
  let newHighScore = $state(false);

  onMount(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        highScore = Number(stored);
      }
    }
  });

  const score = $derived(Math.round((correctCount / questions.length) * 100));

  function selectOption(idx: number) {
    if (confirmed) return;
    selected = idx;
  }

  function confirm() {
    if (selected === null) return;
    confirmed = true;
    if (selected === questions[current].answer) {
      correctCount++;
    }
  }

  function next() {
    if (current < questions.length - 1) {
      current++;
      selected = null;
      confirmed = false;
    } else {
      finished = true;
      if (storageKey) {
        const finalScore = Math.round((correctCount / questions.length) * 100);
        if (highScore === null || finalScore > highScore) {
          highScore = finalScore;
          newHighScore = true;
          localStorage.setItem(storageKey, String(finalScore));
        }
      }
    }
  }

  function restart() {
    current = 0;
    selected = null;
    confirmed = false;
    correctCount = 0;
    finished = false;
    newHighScore = false;
  }

  function optionClass(idx: number): string {
    if (!confirmed) {
      return selected === idx ? 'btn btn-primary' : 'btn btn-outline-secondary';
    }
    if (idx === questions[current].answer) return 'btn btn-success';
    if (idx === selected) return 'btn btn-danger';
    return 'btn btn-outline-secondary';
  }

  function scoreClass(s: number): string {
    if (s >= 80) return 'text-success';
    if (s >= 50) return 'text-warning';
    return 'text-danger';
  }
</script>

<div class="trivia-challenge card border-0 shadow-sm my-4">
  <div class="card-body p-4">
    {#if !finished}
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="badge bg-secondary">Question {current + 1} / {questions.length}</span>
        {#if storageKey && highScore !== null}
          <span class="small text-muted">🏆 Best: <strong>{highScore}</strong>/100</span>
        {/if}
      </div>

      <p class="fs-5 fw-semibold mb-3">{questions[current].question}</p>

      <div class="d-grid gap-2 mb-3">
        {#each questions[current].options as option, idx}
          <button
            class={optionClass(idx)}
            onclick={() => selectOption(idx)}
            disabled={confirmed && idx !== questions[current].answer && idx !== selected}
          >
            {option}
          </button>
        {/each}
      </div>

      {#if confirmed}
        <div class="alert {selected === questions[current].answer ? 'alert-success' : 'alert-danger'} py-2">
          {#if selected === questions[current].answer}
            ✅ Correct!
          {:else}
            ❌ Wrong! The correct answer is: <strong>{questions[current].options[questions[current].answer]}</strong>
          {/if}
        </div>
        <button class="btn btn-primary w-100" onclick={next}>
          {current < questions.length - 1 ? 'Next Question →' : 'See Results'}
        </button>
      {:else}
        <button class="btn btn-primary w-100" onclick={confirm} disabled={selected === null}>
          Submit Answer
        </button>
      {/if}
    {:else}
      <div class="text-center py-3">
        <div class="display-4 fw-bold {scoreClass(score)}">{score}<span class="fs-3">/100</span></div>
        <p class="text-muted mb-1">You got {correctCount} out of {questions.length} questions right.</p>

        {#if storageKey}
          {#if newHighScore}
            <div class="alert alert-warning mt-2 py-2">🎉 New high score!</div>
          {:else if highScore !== null}
            <p class="small text-muted">🏆 Your best score: <strong>{highScore}</strong>/100</p>
          {/if}
        {/if}

        <button class="btn btn-outline-primary mt-3" onclick={restart}>Try Again</button>
      </div>
    {/if}
  </div>
</div>
