<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
		updateDoc
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
		'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות',
		'קדושים', 'אמור', 'בהר', 'בחקותי', 'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חקת',
		'בלק', 'פינחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא',
		'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
	];
	const DAVENING_PORTION_GROUPS = {
		Shabbat: [
			{ label: 'Kabbalat Shabbat & Maariv', value: 'Kabbalat Shabbat & Maariv' },
			{ label: 'Shacharit', value: 'Shabbat Shacharit' },
			{ label: 'Mussaf', value: 'Shabbat Mussaf' },
			{ label: 'Mincha', value: 'Shabbat Mincha' },
			{ label: 'Maariv (Motzei Shabbat/Yom Tov)', value: 'Maariv (Motzei Shabbat/Yom Tov)' }
		],
		'Yom Tov': [
			{ label: 'Shacharit', value: 'Yom Tov Shacharit' },
			{ label: 'Mussaf', value: 'Yom Tov Mussaf' },
			{ label: 'Mincha', value: 'Yom Tov Mincha' }
		]
	} as const;
	const DAVENING_PORTIONS = Object.values(DAVENING_PORTION_GROUPS).flat().map((option) => option.value);

	type SignupDoc = {
		id: string;
		englishName: string;
		hebrewName: string;
		tribe: Tribe;
		davening: { canDaven: boolean; portions: string[] };
		leining: { ability: LeiningAbility; barMitzvahParasha: string; parshiot: string[] };
		submittedAtLabel: string;
	};

	type EditDraft = {
		englishName: string;
		hebrewName: string;
		tribe: Tribe;
		canDaven: boolean;
		daveningPortions: Record<string, boolean>;
		leiningAbility: LeiningAbility;
		barMitzvahParasha: string;
		leiningParshiot: Record<string, boolean>;
	};

	let loginError = '';
	let statusMessage = '';
	let loggingIn = false;
	let loading = false;
	let saving = false;
	let user: User | null = null;
	let isAuthorized = false;

	let submissions: SignupDoc[] = [];
	let selectedId = '';
	let draft: EditDraft | null = null;
	let selectedParsha = '';
	const defaultAdminEmail = 'rafikis75@gmail.com';
	const googleProvider = new GoogleAuthProvider();

	function normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}

	async function hasAdminAccess(candidate: string | null | undefined): Promise<boolean> {
		if (!candidate) return false;
		const normalized = normalizeEmail(candidate);
		if (normalized === defaultAdminEmail) return true;
		try {
			const adminRecord = await getDoc(doc(db, 'admin-users', normalized));
			return adminRecord.exists();
		} catch (error) {
			console.error('Failed to check admin allowlist:', error);
			statusMessage = 'Could not check admin access. Verify Firestore rules for admin-users.';
			return false;
		}
	}

	$: if (!selectedParsha && PARSHIOT.length > 0) {
		selectedParsha = PARSHIOT[0];
	}

	function canLeinParsha(record: SignupDoc, parsha: string): boolean {
		if (!parsha) return false;
		if (record.leining.parshiot.includes(parsha)) return true;
		return record.leining.ability !== 'none' && record.leining.barMitzvahParasha === parsha;
	}

	function matchingLeiners(parsha: string): SignupDoc[] {
		return submissions.filter((record) => canLeinParsha(record, parsha));
	}

	function formatTimestamp(value: unknown): string {
		if (
			typeof value === 'object' &&
			value !== null &&
			'toDate' in value &&
			typeof (value as { toDate: () => Date }).toDate === 'function'
		) {
			return (value as { toDate: () => Date }).toDate().toLocaleString();
		}
		return 'Unknown';
	}

	function buildDoc(id: string, raw: Record<string, unknown>): SignupDoc {
		const davening = (raw.davening ?? {}) as { canDaven?: boolean; portions?: string[] };
		const leining = (raw.leining ?? {}) as {
			ability?: LeiningAbility;
			barMitzvahParasha?: string;
			parshiot?: string[];
		};

		return {
			id,
			englishName: typeof raw.englishName === 'string' ? raw.englishName : '',
			hebrewName: typeof raw.hebrewName === 'string' ? raw.hebrewName : '',
			tribe: (raw.tribe as Tribe) || '',
			davening: {
				canDaven: Boolean(davening.canDaven),
				portions: Array.isArray(davening.portions) ? davening.portions.filter((v): v is string => typeof v === 'string') : []
			},
			leining: {
				ability: (leining.ability as LeiningAbility) || 'none',
				barMitzvahParasha: typeof leining.barMitzvahParasha === 'string' ? leining.barMitzvahParasha : '',
				parshiot: Array.isArray(leining.parshiot) ? leining.parshiot.filter((v): v is string => typeof v === 'string') : []
			},
			submittedAtLabel: formatTimestamp(raw.submittedAt)
		};
	}

	function loadDraft(record: SignupDoc) {
		const daveningPortions: Record<string, boolean> = {};
		for (const portion of DAVENING_PORTIONS) daveningPortions[portion] = false;
		for (const portion of record.davening.portions) {
			if (portion in daveningPortions) daveningPortions[portion] = true;
		}

		const leiningParshiot: Record<string, boolean> = {};
		for (const parsha of PARSHIOT) leiningParshiot[parsha] = false;
		for (const parsha of record.leining.parshiot) {
			if (parsha in leiningParshiot) leiningParshiot[parsha] = true;
		}

		draft = {
			englishName: record.englishName,
			hebrewName: record.hebrewName,
			tribe: record.tribe,
			canDaven: record.davening.canDaven,
			daveningPortions,
			leiningAbility: record.leining.ability,
			barMitzvahParasha: record.leining.barMitzvahParasha,
			leiningParshiot
		};
	}

	async function fetchSubmissions() {
		loading = true;
		statusMessage = '';
		try {
			const q = query(collection(db, 'aliyot-signups'), orderBy('submittedAt', 'desc'));
			const snapshot = await getDocs(q);
			submissions = snapshot.docs.map((entry) => buildDoc(entry.id, entry.data()));
			if (submissions.length > 0) {
				if (!selectedId || !submissions.find((s) => s.id === selectedId)) {
					selectedId = submissions[0].id;
				}
				const selected = submissions.find((s) => s.id === selectedId);
				if (selected) loadDraft(selected);
			} else {
				selectedId = '';
				draft = null;
			}
		} catch (error) {
			console.error('Failed to load submissions:', error);
			statusMessage = 'Could not load submissions. Check Firestore permissions and try again.';
		} finally {
			loading = false;
		}
	}

	function selectRecord(id: string) {
		selectedId = id;
		const selected = submissions.find((item) => item.id === id);
		if (selected) loadDraft(selected);
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
			loginError = 'Google sign-in failed. Make sure your Google account is enabled in Firebase Auth.';
		} finally {
			loggingIn = false;
		}
	}

	async function handleLogout() {
		if (!auth) return;
		await signOut(auth);
		submissions = [];
		draft = null;
		selectedId = '';
		statusMessage = '';
	}

	async function saveChanges(event: SubmitEvent) {
		event.preventDefault();
		if (!draft || !selectedId) return;
		if (!draft.englishName.trim()) {
			statusMessage = 'English name is required.';
			return;
		}
		if (!draft.tribe) {
			statusMessage = 'Tribe is required.';
			return;
		}

		saving = true;
		statusMessage = '';

		const currentDraft = draft;
		const daveningPortions = DAVENING_PORTIONS.filter((portion) => currentDraft.daveningPortions[portion]);
		const leiningParshiot = PARSHIOT.filter((parsha) => currentDraft.leiningParshiot[parsha]);

		try {
			await updateDoc(doc(db, 'aliyot-signups', selectedId), {
				englishName: currentDraft.englishName.trim(),
				hebrewName: currentDraft.hebrewName.trim(),
				tribe: currentDraft.tribe,
				davening: {
					canDaven: currentDraft.canDaven,
					portions: daveningPortions
				},
				leining: {
					ability: currentDraft.leiningAbility,
					barMitzvahParasha: currentDraft.barMitzvahParasha.trim(),
					parshiot: leiningParshiot
				},
				updatedAt: serverTimestamp()
			});

			submissions = submissions.map((record) =>
				record.id === selectedId
					? {
							...record,
							englishName: currentDraft.englishName.trim(),
							hebrewName: currentDraft.hebrewName.trim(),
							tribe: currentDraft.tribe,
							davening: { canDaven: currentDraft.canDaven, portions: daveningPortions },
							leining: {
								ability: currentDraft.leiningAbility,
								barMitzvahParasha: currentDraft.barMitzvahParasha.trim(),
								parshiot: leiningParshiot
							}
						}
					: record
			);

			statusMessage = 'Saved.';
		} catch (error) {
			console.error('Failed to save changes:', error);
			statusMessage = 'Save failed. Check Firestore permissions and try again.';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		if (!auth) {
			statusMessage = 'Firebase Auth is not available.';
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
			user = nextUser;
			isAuthorized = await hasAdminAccess(nextUser?.email);
			if (nextUser && isAuthorized) {
				await fetchSubmissions();
				return;
			}
			submissions = [];
			draft = null;
			selectedId = '';
		});

		return () => unsubscribe();
	});
</script>

<svelte:head>
	<title>Aliyot Signup Admin – Commons Minyan</title>
</svelte:head>

<div class="page">
	<header class="header">
		<a href={resolve('/aliyot-signup')} class="back-link">← Aliyot Signup</a>
		<h1>Aliyot Signup Admin</h1>
		<p>Sign in to view and edit submitted signup information.</p>
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
		<div class="top-actions">
			<p>Signed in as <strong>{user.email}</strong></p>
			<div class="buttons">
				<button onclick={fetchSubmissions} disabled={loading}>Refresh</button>
				<button onclick={handleLogout}>Sign out</button>
			</div>
		</div>

		{#if statusMessage}<p class="status">{statusMessage}</p>{/if}

		<div class="admin-grid">
			<section class="card list-panel">
				<h2>Submissions ({submissions.length})</h2>
				{#if loading}
					<p>Loading…</p>
				{:else if submissions.length === 0}
					<p>No submissions found.</p>
				{:else}
					<ul>
						{#each submissions as item}
							<li>
								<button
									class:selected={item.id === selectedId}
									class="list-item"
									onclick={() => selectRecord(item.id)}
								>
									<div class="name">{item.englishName || '(No name)'}</div>
									<div class="meta">{item.tribe || 'No tribe'} • {item.submittedAtLabel}</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="parsha-lookup">
					<h3>Who can lein this Parsha?</h3>
					<select bind:value={selectedParsha}>
						{#each PARSHIOT as p}
							<option value={p}>{p}</option>
						{/each}
					</select>
					{#if matchingLeiners(selectedParsha).length === 0}
						<p class="meta">No matching leiners found.</p>
					{:else}
						<ul class="leiner-list">
							{#each matchingLeiners(selectedParsha) as person}
								<li>
									<strong>{person.englishName}</strong>
									<span class="meta" dir="rtl">({person.hebrewName || '—'})</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>

			<section class="card">
				<h2>Edit Submission</h2>
				{#if !draft}
					<p>Select a submission to edit.</p>
				{:else}
					<form class="edit-form" onsubmit={saveChanges}>
						<label>
							English Name
							<input type="text" bind:value={draft.englishName} required />
						</label>
						<label>
							Hebrew Name
							<input type="text" bind:value={draft.hebrewName} />
						</label>
						<label>
							Tribe
							<select bind:value={draft.tribe} required>
								<option value="">-- Select --</option>
								<option value="Kohen">Kohen</option>
								<option value="Levi">Levi</option>
								<option value="Yisrael">Yisrael</option>
							</select>
						</label>
						<label class="checkbox-row">
							<input type="checkbox" bind:checked={draft.canDaven} />
							Can lead davening
						</label>
						{#if draft.canDaven}
							<div class="grouped-options">
								<p class="group-label">Davening Portions</p>
								{#each Object.entries(DAVENING_PORTION_GROUPS) as [groupName, portions]}
									<div class="option-group">
										<p class="option-group-title">{groupName}</p>
										{#each portions as portion}
											<label class="checkbox-row">
												<input type="checkbox" bind:checked={draft.daveningPortions[portion.value]} />
												{portion.label}
											</label>
										{/each}
									</div>
								{/each}
							</div>
						{/if}
						<label>
							Leining Ability
							<select bind:value={draft.leiningAbility}>
								<option value="none">I don't lein</option>
								<option value="bar_mitzvah_only">Bar Mitzvah parasha only</option>
								<option value="can_help">I can lein specific parshiot</option>
								<option value="when_asked">I can lein when asked</option>
								<option value="comfortable">Comfortable / regular</option>
							</select>
						</label>
						<label>
							Bar/Bat Mitzvah Parasha
							<select bind:value={draft.barMitzvahParasha}>
								<option value="">-- Select parasha --</option>
								{#each PARSHIOT as p}
									<option value={p}>{p}</option>
								{/each}
							</select>
						</label>
						{#if draft.leiningAbility === 'can_help' || draft.leiningAbility === 'when_asked' || draft.leiningAbility === 'comfortable'}
							<div class="grouped-options">
								<p class="group-label">Leining Parshiot</p>
								<div class="parsha-grid">
									{#each PARSHIOT as p}
										<label class="checkbox-row">
											<input type="checkbox" bind:checked={draft.leiningParshiot[p]} />
											{p}
										</label>
									{/each}
								</div>
							</div>
						{/if}
						<button type="submit" disabled={saving}>
							{saving ? 'Saving…' : 'Save changes'}
						</button>
					</form>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Frank Ruhl Libre', serif;
		background: #f7f7f2;
		color: #222;
	}

	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px 16px 32px;
	}

	.header h1 {
		margin: 0 0 6px;
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
		padding: 16px;
	}

	.login {
		max-width: 420px;
		display: grid;
		gap: 10px;
	}

	.top-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		gap: 10px;
		flex-wrap: wrap;
	}

	.buttons {
		display: flex;
		gap: 8px;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: 360px 1fr;
		gap: 16px;
	}

	.list-panel ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}

	.parsha-lookup {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid #ddd;
		display: grid;
		gap: 10px;
	}

	.parsha-lookup h3 {
		margin: 0;
		font-size: 18px;
	}

	.leiner-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}

	.list-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fafafa;
		cursor: pointer;
	}

	.list-item.selected {
		border-color: #1976d2;
		background: #e8f1fd;
	}

	.name {
		font-weight: 700;
	}

	.meta {
		font-size: 14px;
		color: #555;
	}

	.edit-form {
		display: grid;
		gap: 10px;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 600;
	}

	input,
	select,
	button {
		font-family: inherit;
		font-size: 15px;
		padding: 8px 10px;
	}

	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.grouped-options {
		display: grid;
		gap: 8px;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		padding: 10px;
		background: #fafafa;
	}

	.group-label {
		margin: 0;
		font-weight: 700;
	}

	.option-group {
		display: grid;
		gap: 6px;
	}

	.option-group-title {
		margin: 0;
		font-weight: 700;
		font-size: 14px;
	}

	.parsha-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 6px 12px;
	}

	.status {
		margin: 0 0 10px;
		font-weight: 600;
		color: #1565c0;
	}

	.error {
		color: #b71c1c;
		font-weight: 600;
	}

	@media (max-width: 900px) {
		.admin-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
