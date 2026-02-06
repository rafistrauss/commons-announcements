<script lang="ts">
import { onMount } from 'svelte';

const STORAGE_KEY = 'minyan-signup-status';
const defaultPeople = [
  { name: 'Adam Blank', responded: false },
  { name: 'Adam Ramos', responded: false },
  { name: 'Amira Herstic', responded: false },
  { name: 'Andrew Botvinik', responded: false },
  { name: 'Ari Spivack', responded: false },
  { name: 'Ariel Schabes', responded: false },
  { name: 'Arny Bal', responded: false },
  { name: 'Ben Kohane', responded: false },
  { name: 'Ben Strachman', responded: false },
  { name: 'Daniel Blau', responded: false },
  { name: 'Dina Margelovich', responded: false },
  { name: 'Doni Goldstien', responded: false },
  { name: 'Dror Galili', responded: false },
  { name: 'Jason Weiss', responded: false },
  { name: 'Jay Berman', responded: false },
  { name: 'Jeremy Tuch', responded: false },
  { name: 'Joey Silverstein', responded: false },
  { name: 'Josh Tepper', responded: false },
  { name: 'Max Kimmel', responded: false },
  { name: 'Meir Spector', responded: false },
  { name: 'Michael Bernstein', responded: false },
  { name: 'Michael Schwartz', responded: false },
  { name: 'Michael Shapiro', responded: false },
  { name: 'Rafe', responded: false },
  { name: 'Rafi Strauss', responded: false },
  { name: 'Shneur Kovacs', responded: false },
  { name: 'Uri Strauss', responded: false },
  { name: 'Yehonatan Haimovici', responded: false },
  { name: 'Yoel Gerstein', responded: false },
  // { name: 'Yoni Block', responded: false },
  { name: 'Yoni Friedman', responded: false },
  // { name: 'Zev Newman', responded: false },
  { name: 'Zvi Wiesenfeld', responded: false },
  
  
].sort((a, b) => a.name.localeCompare(b.name));

let people = [];

function savePeople() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}

function loadPeople() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Defensive: ensure all names are present
      if (Array.isArray(parsed)) {
        // Merge with defaultPeople to handle new/removed people
        const merged = defaultPeople.map(def => {
          const found = parsed.find((p: any) => p.name === def.name);
          return found ? { ...def, responded: found.responded } : def;
        });
        return merged;
      }
    } catch {}
  }
  return defaultPeople;
}

onMount(() => {
  people = loadPeople();
});

function markResponded(index: number) {
  people[index].responded = true;
  savePeople();
}

function resetAll() {
  people = defaultPeople.map(p => ({ ...p }));
  savePeople();
}
</script>



<h1>Minyan Signup Status</h1>
<button on:click={resetAll} style="margin-bottom: 1rem;">Reset All</button>
<div class="columns">
  <div>
    <h2>Not Responded</h2>
    <ul>
      {#each people.filter(p => !p.responded) as person, i}
        <li>
          {person.name}
          <button on:click={() => markResponded(people.findIndex(p2 => p2.name === person.name))}>Mark as Responded</button>
        </li>
      {/each}
    </ul>
  </div>
  <div>
    <h2>Responded</h2>
    <ul>
      {#each people.filter(p => p.responded) as person}
        <li>{person.name}</li>
      {/each}
    </ul>
  </div>
</div>

{#if people.every(p => p.responded)}
  <p>All users have responded!</p>
{/if}

<style>
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  margin-bottom: 0.5rem;
}
button {
  margin-left: 1rem;
}
h2 {
  margin-bottom: 0.5rem;
}
</style>
