<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import {
		collection,
		getDocs,
		orderBy,
		query
	} from 'firebase/firestore';
	import {
		GoogleAuthProvider,
		onAuthStateChanged,
		signInWithPopup,
		signOut,
		type User
	} from 'firebase/auth';
	import { auth, db } from '$lib/firebase';

	type Tribe = 'Kohen' | 'Levi' | 'Yisrael' | '';
	type LeiningAbility = 'none' | 'bar_mitzvah_only' | 'can_help' | 'when_asked' | 'comfortable';

	const PARSHIOT = [
		'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
		'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
		'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצרע', 'אחרי מות',
		'קדושים', 'אמור', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
		'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא',
		'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
	];

	type SignupDoc = {
		id: string;
		englishName: string;
		hebrewName: string;
		tribe: Tribe;
		alumni: boolean;
		davening: { canDaven: boolean; portions: string[] };
		leining: { ability: LeiningAbility; barMitzvahParsha: string; parshiot: string[] };
	};

	let loginError = '';
	let statusMessage = '';
	let loggingIn = false;
	let user: User | null = null;
	let isAuthorized = false;

	let submissions: SignupDoc[] = [];
	let selectedParsha = '';
	let weekOffset = 0;
	let currentParsha = '';
	let currentDate = '';

	const defaultAdminEmail = (import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
	const googleProvider = new GoogleAuthProvider();

	function normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}

	async function hasAdminAccess(candidate: string | null | undefined): Promise<boolean> {
		if (!candidate) return false;
		const normalized = normalizeEmail(candidate);
		if (defaultAdminEmail && normalized === defaultAdminEmail) return true;
		try {
			const { getDoc, doc } = await import('firebase/firestore');
			const adminRecord = await getDoc(doc(db, 'admin-users', normalized));
			return adminRecord.exists();
		} catch (error) {
			console.error('Failed to check admin allowlist:', error);
			statusMessage = 'Could not check admin access.';
			return false;
		}
	}

	function canLeinParsha(record: SignupDoc, parsha: string): boolean {
		if (!parsha) return false;
		if (record.alumni) return false;
		if (record.leining.parshiot.includes(parsha)) return true;
		return record.leining.ability !== 'none' && record.leining.barMitzvahParsha === parsha;
	}

	function matchingLeiners(parsha: string): SignupDoc[] {
		return submissions.filter((record) => canLeinParsha(record, parsha));
	}

	async function fetchSubmissions() {
		try {
			const q = query(collection(db, 'aliyot-signups'), orderBy('submittedAt', 'desc'));
			const snapshot = await getDocs(q);
			submissions = snapshot.docs.map((entry) => {
				const raw = entry.data();
				const davening = (raw.davening ?? {}) as { canDaven?: boolean; portions?: string[] };
				const leining = (raw.leining ?? {}) as {
					ability?: LeiningAbility;
					barMitzvahParsha?: string;
					parshiot?: string[];
				};

				return {
					id: entry.id,
					englishName: typeof raw.englishName === 'string' ? raw.englishName : '',
					hebrewName: typeof raw.hebrewName === 'string' ? raw.hebrewName : '',
					tribe: (raw.tribe as Tribe) || '',
					alumni: Boolean(raw.alumni),
					davening: {
						canDaven: Boolean(davening.canDaven),
						portions: Array.isArray(davening.portions)
							? davening.portions.filter((v): v is string => typeof v === 'string')
							: []
					},
					leining: {
						ability: (leining.ability as LeiningAbility) || 'none',
						barMitzvahParsha: typeof leining.barMitzvahParsha === 'string' ? leining.barMitzvahParsha : '',
						parshiot: Array.isArray(leining.parshiot)
							? leining.parshiot.filter((v): v is string => typeof v === 'string')
							: []
					}
				};
			});
		} catch (error) {
			console.error('Failed to load submissions:', error);
			statusMessage = 'Could not load submissions.';
		}
	}

	async function fetchParshaForWeek(offset: number) {
		try {
			const response = await fetch(`/api/parsha-by-week?offset=${offset}`);
			if (response.ok) {
				const data = await response.json();
				currentParsha = data.parsha || '';
				currentDate = data.englishDate || '';
				selectedParsha = currentParsha;
			}
		} catch (error) {
			console.error('Failed to fetch parsha:', error);
		}
	}

	function previousWeek() {
		weekOffset--;
		fetchParshaForWeek(weekOffset);
	}

	function nextWeek() {
		weekOffset++;
		fetchParshaForWeek(weekOffset);
	}

	async function handleGoogleLogin() {
		if (!auth) {
			loginError = 'Firebase Auth is not available.';
			return;
		}
		loginError = '';
		statusMessage = '';
		loggingIn = true;
		try {
			await signInWithPopup(auth, googleProvider);
		} catch (error) {
			console.error('Login failed:', error);
			loginError = 'Google sign-in failed.';
		} finally {
			loggingIn = false;
		}
	}

	async function handleLogout() {
		if (!auth) return;
		await signOut(auth);
		submissions = [];
		statusMessage = '';
	}

	onMount(async () => {
		if (!auth) {
			statusMessage = 'Firebase Auth is not available.';
			return;
		}

		await fetchParshaForWeek(weekOffset);

		const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
			user = nextUser;
			isAuthorized = await hasAdminAccess(nextUser?.email);
			if (nextUser && isAuthorized) {
				await fetchSubmissions();
				return;
			}
			submissions = [];
		});

		return () => unsubscribe();
	});
</script>

<svelte:head>
	<title>Admin – Leiners Lookup – Commons Minyan</title>
</svelte:head>

<div class="page">
	<header class="header">
		<a href={resolve('/')} class="back-link">← Home</a>
		<h1>Leiners Lookup</h1>
		<p>View who can lein for each parsha.</p>
	</header>

	{#if !user}
		<div class="card login">
			<p>Sign in with Google to access the admin console.</p>
			{#if loginError}<p class="error">{loginError}</p>{/if}
			<button type="button" onclick={handleGoogleLogin} disabled={loggingIn}>
				{loggingIn ? 'Signing in…' : 'Sign in with Google'}
			</button>
		</div>
	{:else if !isAuthorized}
		<div class="card">
			<p class="error">Signed in as {user.email}, but this account is not allowed to access admin data.</p>
			<button onclick={handleLogout}>Sign out</button>
		</div>
	{:else}
		<div class="top-bar">
			<div class="current-info">
				<p dir="rtl" class="hebrew-date">{currentParsha || '—'}</p>
				<p class="english-date">{currentDate || 'Loading…'}</p>
			</div>
			<div class="nav-controls">
				<button onclick={previousWeek}>← Previous Week</button>
				<button onclick={nextWeek}>Next Week →</button>
			</div>
			<button onclick={handleLogout} class="logout-btn">Sign out</button>
		</div>

		{#if statusMessage}<p class="status">{statusMessage}</p>{/if}

		<div class="parsha-selector">
			<label>
				Select Parsha:
				<select bind:value={selectedParsha}>
					<option value="">-- Select --</option>
					{#each PARSHIOT as p}
						<option value={p}>{p}</option>
					{/each}
				</select>
			</label>
		</div>

		<section class="card">
			<h2 dir="rtl">{selectedParsha || 'No parsha selected'}</h2>
			{#if !selectedParsha}
				<p>Select a parsha to view who can lein.</p>
			{:else if matchingLeiners(selectedParsha).length === 0}
				<p class="no-results">No leiners found for this parsha.</p>
			{:else}
				<ul class="leiners-list">
					{#each matchingLeiners(selectedParsha) as person}
						<li class="leiner-card">
							<div class="leiner-name">{person.englishName}</div>
							<div class="leiner-hebrew" dir="rtl">{person.hebrewName || '—'}</div>
							<div class="leiner-tribe">{person.tribe || 'Unknown'}</div>
							<div class="leiner-ability">
								{#if person.leining.ability === 'bar_mitzvah_only'}
									Bar Mitzvah only
								{:else if person.leining.ability === 'can_help'}
									Can help
								{:else if person.leining.ability === 'when_asked'}
									When asked
								{:else if person.leining.ability === 'comfortable'}
									Regular leiner
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page {
		font-family: 'Frank Ruhl Libre', serif;
		background: #f7f7f2;
		color: #222;
		min-height: 100vh;
		max-width: 900px;
		margin: 0 auto;
		padding: 20px 16px 32px;
	}

	.header {
		margin-bottom: 20px;
	}

	.header h1 {
		margin: 0 0 6px;
		font-size: 32px;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 10px;
		color: #1976d2;
		text-decoration: none;
	}

	.card {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 16px;
	}

	.login {
		max-width: 420px;
		display: grid;
		gap: 10px;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		gap: 20px;
		flex-wrap: wrap;
	}

	.current-info {
		text-align: center;
		flex: 1;
		min-width: 200px;
	}

	.hebrew-date {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
		color: #2e7d32;
	}

	.english-date {
		margin: 4px 0 0;
		font-size: 14px;
		color: #666;
	}

	.nav-controls {
		display: flex;
		gap: 10px;
	}

	.nav-controls button,
	.logout-btn {
		background: #1976d2;
		color: white;
		border: none;
		padding: 10px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
	}

	.nav-controls button:hover {
		background: #1565c0;
	}

	.logout-btn {
		background: #f44336;
	}

	.logout-btn:hover {
		background: #d32f2f;
	}

	.parsha-selector {
		margin-bottom: 16px;
	}

	.parsha-selector label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 600;
	}

	.parsha-selector select {
		font-family: inherit;
		font-size: 16px;
		padding: 8px 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		flex: 1;
		max-width: 300px;
	}

	.card h2 {
		margin: 0 0 16px;
		font-size: 24px;
	}

	.no-results {
		color: #999;
		font-style: italic;
	}

	.leiners-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 12px;
	}

	.leiner-card {
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		padding: 12px;
		background: #fafafa;
		display: grid;
		gap: 4px;
	}

	.leiner-name {
		font-weight: 700;
		font-size: 16px;
	}

	.leiner-hebrew {
		font-size: 14px;
		color: #555;
	}

	.leiner-tribe {
		font-size: 13px;
		color: #999;
	}

	.leiner-ability {
		font-size: 13px;
		font-weight: 600;
		color: #1976d2;
	}

	.status {
		padding: 10px;
		background: #e3f2fd;
		border: 1px solid #1976d2;
		border-radius: 4px;
		color: #1565c0;
		margin-bottom: 16px;
	}

	.error {
		color: #d32f2f;
		font-weight: 600;
	}

	button {
		font-family: inherit;
	}

	@media (max-width: 600px) {
		.top-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.nav-controls {
			justify-content: center;
		}

		.parsha-selector label {
			flex-direction: column;
		}

		.parsha-selector select {
			max-width: none;
		}
	}
</style>
