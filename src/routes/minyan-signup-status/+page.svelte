<script lang="ts">
import { onMount } from 'svelte';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, db } from '$lib/firebase';
import { resolve } from '$app/paths';

const STORAGE_KEY = 'minyan-signup-status';
const defaultAdminEmail = (import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();

type Person = { name: string; responded: boolean };

let people: Person[] = [];
let user: User | null = null;
let isAuthorized = false;
let loading = false;
let message = '';

function loadResponded(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.map((p: any) => [p.name, Boolean(p.responded)]));
    }
  } catch {}
  return {};
}

function savePeople() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}

async function hasAdminAccess(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (defaultAdminEmail && normalized === defaultAdminEmail) return true;
  try {
    return (await getDoc(doc(db, 'admin-users', normalized))).exists();
  } catch {
    return false;
  }
}

async function fetchPeople() {
  loading = true;
  message = '';
  try {
    const snapshot = await getDocs(collection(db, 'aliyot-signups'));
    const responded = loadResponded();
    people = snapshot.docs
      .map((entry) => entry.data())
      .filter((raw) => !raw.alumni && !raw.hideFromSignupStatus)
      .map((raw) => (typeof raw.englishName === 'string' ? raw.englishName.trim() : ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, responded: responded[name] ?? false }));
  } catch (error) {
    console.error('Failed to load people:', error);
    message = 'Could not load people.';
  } finally {
    loading = false;
  }
}

async function handleLogin() {
  if (!auth) return;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch {
    message = 'Google sign-in failed.';
  }
}

onMount(() => {
  if (!auth) return;
  return onAuthStateChanged(auth, async (next) => {
    user = next;
    isAuthorized = await hasAdminAccess(next?.email);
    if (next && isAuthorized) await fetchPeople();
    else people = [];
  });
});

let search = '';
let copied = false;

$: query = search.trim().toLowerCase();
$: pending = people.filter((p) => !p.responded && p.name.toLowerCase().includes(query));
$: done = people.filter((p) => p.responded && p.name.toLowerCase().includes(query));
$: respondedCount = people.filter((p) => p.responded).length;
$: percent = people.length ? Math.round((respondedCount / people.length) * 100) : 0;

function setResponded(name: string, responded: boolean) {
  people = people.map((p) => (p.name === name ? { ...p, responded } : p));
  savePeople();
}

async function copyPending() {
  const names = people.filter((p) => !p.responded).map((p) => p.name).join('\n');
  await navigator.clipboard.writeText(names);
  copied = true;
  setTimeout(() => (copied = false), 1500);
}

function resetAll() {
  if (!confirm('Mark everyone as not responded?')) return;
  people = people.map((p) => ({ ...p, responded: false }));
  savePeople();
}
</script>

<svelte:head>
  <title>Minyan Signup Status – Commons Minyan</title>
</svelte:head>

<div class="page">
  <a class="back" href={resolve('/aliyot-signup/admin/')}>← Admin</a>
  <h1>Minyan Signup Status</h1>

  {#if message}<p class="notice">{message}</p>{/if}

  {#if !user}
    <div class="card center">
      <p>Sign in with Google to view signup status.</p>
      <button class="primary" on:click={handleLogin}>Sign in with Google</button>
    </div>
  {:else if !isAuthorized}
    <div class="card center">
      <p>Signed in as {user.email}, but this account is not allowed to access admin data.</p>
      <button on:click={() => auth && signOut(auth)}>Sign out</button>
    </div>
  {:else if loading}
    <p>Loading…</p>
  {:else}
    <div class="card summary">
      <div class="summary-top">
        <strong>{respondedCount} of {people.length} responded</strong>
        <span class="pct">{percent}%</span>
      </div>
      <div class="bar" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
        <div class="fill" style="width: {percent}%"></div>
      </div>
      <div class="toolbar">
        <input type="search" placeholder="Search names…" bind:value={search} />
        <button on:click={copyPending} disabled={respondedCount === people.length}>
          {copied ? 'Copied ✓' : 'Copy not responded'}
        </button>
        <button on:click={fetchPeople}>Refresh</button>
        <button class="danger" on:click={resetAll}>Reset all</button>
      </div>
    </div>

    {#if people.length > 0 && respondedCount === people.length}
      <p class="notice success">🎉 Everyone has responded!</p>
    {/if}

    <div class="columns">
      <section class="card">
        <h2>Not responded <span class="count">{pending.length}</span></h2>
        <ul>
          {#each pending as person (person.name)}
            <li>
              <span>{person.name}</span>
              <button class="primary small" on:click={() => setResponded(person.name, true)}>✓ Responded</button>
            </li>
          {:else}
            <li class="empty">Nobody here.</li>
          {/each}
        </ul>
      </section>
      <section class="card">
        <h2>Responded <span class="count">{done.length}</span></h2>
        <ul>
          {#each done as person (person.name)}
            <li>
              <span>{person.name}</span>
              <button class="small" on:click={() => setResponded(person.name, false)}>Undo</button>
            </li>
          {:else}
            <li class="empty">Nobody here yet.</li>
          {/each}
        </ul>
      </section>
    </div>
  {/if}
</div>

<style>
.page {
  max-width: 56rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
.back {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.9rem;
}
h1 {
  margin: 0.5rem 0 1.25rem;
}
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  color: #111827;
}
.center {
  text-align: center;
}
.summary {
  margin-bottom: 1.25rem;
}
.summary-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.pct {
  color: #6b7280;
}
.bar {
  height: 0.6rem;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: #16a34a;
  transition: width 0.3s;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.toolbar input {
  flex: 1 1 12rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font: inherit;
}
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}
@media (max-width: 40rem) {
  .columns {
    grid-template-columns: 1fr;
  }
}
h2 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.count {
  background: #e5e7eb;
  border-radius: 999px;
  padding: 0 0.6rem;
  font-size: 0.85rem;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid #f3f4f6;
}
li:first-child {
  border-top: none;
}
.empty {
  color: #9ca3af;
  justify-content: center;
}
button {
  font: inherit;
  padding: 0.45rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #f3f4f6;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
button.primary:hover:not(:disabled) {
  background: #1d4ed8;
}
button.danger {
  color: #b91c1c;
}
button.small {
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
}
.notice {
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  background: #fef3c7;
  color: #92400e;
}
.notice.success {
  background: #dcfce7;
  color: #166534;
}
</style>
