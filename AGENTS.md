# Agent Guidelines

## CSS — never use @import in component style blocks

**Rule:** Never use `@import url(...)` inside a Svelte `<style>` block. Never use `:global(body)` or any other `:global()` selector except when explicitly targeting elements outside the component tree.

**Why:** SvelteKit prefetches linked pages on hover. When a page's CSS bundle contains an `@import` (e.g., a Google Fonts import) or a `:global()` rule, those styles get injected into the *current* page as part of prefetch — causing fonts to load mid-render, visual layout shifts, and style bleed across routes.

**Correct pattern:** Load external fonts with a `<link>` tag inside `<svelte:head>`. Keep all `:global()` usage to zero unless there is no scoped alternative.

```svelte
<!-- ✅ correct -->
<svelte:head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" />
</svelte:head>

<style>
  .page { font-family: 'Frank Ruhl Libre', serif; }
</style>

<!-- ❌ wrong — leaks into other pages on hover/prefetch -->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap');
  :global(body) { font-family: 'Frank Ruhl Libre', serif; }
</style>
```
