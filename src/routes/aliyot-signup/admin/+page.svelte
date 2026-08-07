<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		deleteDoc,
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
		hebrewGivenName: string;
		hebrewFatherName: string;
		tribe: Tribe;
		alumni: boolean;
		davening: { canDaven: boolean; portions: string[] };
		leining: { ability: LeiningAbility; barMitzvahParsha: string; parshiot: string[]; primaryParshiot: string[] };
		submittedAtLabel: string;
	};

	type EditDraft = {
		englishName: string;
		hebrewGivenName: string;
		hebrewFatherName: string;
		tribe: Tribe;
		alumni: boolean;
		canDaven: boolean;
		daveningPortions: Record<string, boolean>;
		leiningAbility: LeiningAbility;
		barMitzvahParsha: string;
		leiningParshiot: Record<string, boolean>;
		primaryParshiot: Record<string, boolean>;
	};

	const TRIBES: Exclude<Tribe, ''>[] = ['Kohen', 'Levi', 'Yisrael'];

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
	let showAlumni = false;
	let searchQuery = '';
	let lastUpdatedDate = '';
	const defaultAdminEmail = (import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
	const googleProvider = new GoogleAuthProvider();

	$: activeSubmissions = submissions.filter((record) => !record.alumni);
	$: baseSubmissions = showAlumni ? submissions : activeSubmissions;
	$: visibleSubmissions = searchQuery.trim()
		? baseSubmissions.filter((r) =>
				r.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.hebrewGivenName.includes(searchQuery) ||
				r.hebrewFatherName.includes(searchQuery)
			)
		: baseSubmissions;
	$: aliyotByTribe = TRIBES.map((tribe) => ({
		tribe,
		people: activeSubmissions
			.filter((record) => record.tribe === tribe)
			.slice()
			.sort((a, b) => a.englishName.localeCompare(b.englishName))
	}));

	function tribeSuffix(value: Tribe): string {
		if (value === 'Kohen') return 'הכהן';
		if (value === 'Levi') return 'הלוי';
		return '';
	}

	function splitHebrewName(name: string): { given: string; father: string } {
		const trimmed = name.trim();
		if (!trimmed) return { given: '', father: '' };
		const parts = trimmed.split(' בן ');
		if (parts.length >= 2) {
			return {
				given: parts[0].trim(),
				father: parts.slice(1).join(' בן ').trim()
			};
		}
		return { given: trimmed, father: '' };
	}

	function normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}

	async function hasAdminAccess(candidate: string | null | undefined): Promise<boolean> {
		if (!candidate) return false;
		const normalized = normalizeEmail(candidate);
		if (defaultAdminEmail && normalized === defaultAdminEmail) return true;
		try {
			const adminRecord = await getDoc(doc(db, 'admin-users', normalized));
			return adminRecord.exists();
		} catch (error) {
			console.error('Failed to check admin allowlist:', error);
			statusMessage = 'Could not read admin allowlist. Falling back to allowed signup records.';
			try {
				const adminSignupRecord = await getDoc(doc(db, 'aliyot-signups', normalized));
				return adminSignupRecord.exists();
			} catch (fallbackError) {
				console.error('Fallback admin check also failed:', fallbackError);
				statusMessage = 'Could not check admin access. Verify Firestore rules for admin-users and aliyot-signups.';
				return false;
			}
		}
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
			barMitzvahParsha?: string;
			parshiot?: string[];
			primaryParshiot?: string[];
		};
		const legacyHebrew = splitHebrewName(typeof raw.hebrewName === 'string' ? raw.hebrewName : '');

		return {
			id,
			englishName: typeof raw.englishName === 'string' ? raw.englishName : '',
			hebrewGivenName: typeof raw.hebrewGivenName === 'string'
				? raw.hebrewGivenName
				: legacyHebrew.given,
			hebrewFatherName: typeof raw.hebrewFatherName === 'string'
				? raw.hebrewFatherName
				: legacyHebrew.father,
			tribe: (raw.tribe as Tribe) || '',
			alumni: Boolean(raw.alumni),
			davening: {
				canDaven: Boolean(davening.canDaven),
				portions: Array.isArray(davening.portions) ? davening.portions.filter((v): v is string => typeof v === 'string') : []
			},
			leining: {
				ability: (leining.ability as LeiningAbility) || 'none',
				barMitzvahParsha: typeof leining.barMitzvahParsha === 'string' ? leining.barMitzvahParsha : '',
				parshiot: Array.isArray(leining.parshiot) ? leining.parshiot.filter((v): v is string => typeof v === 'string') : [],
				primaryParshiot: Array.isArray(leining.primaryParshiot) ? leining.primaryParshiot.filter((v): v is string => typeof v === 'string') : []
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

		const primaryParshiot: Record<string, boolean> = {};
		for (const parsha of PARSHIOT) primaryParshiot[parsha] = false;
		for (const parsha of record.leining.primaryParshiot) {
			if (parsha in primaryParshiot) primaryParshiot[parsha] = true;
		}

		draft = {
			englishName: record.englishName,
			hebrewGivenName: record.hebrewGivenName,
			hebrewFatherName: record.hebrewFatherName,
			tribe: record.tribe,
			alumni: record.alumni,
			canDaven: record.davening.canDaven,
			daveningPortions,
			leiningAbility: record.leining.ability,
			barMitzvahParsha: record.leining.barMitzvahParsha,
			leiningParshiot,
			primaryParshiot
		};
	}

	async function fetchSubmissions() {
		loading = true;
		statusMessage = '';
		try {
			const q = query(collection(db, 'aliyot-signups'), orderBy('submittedAt', 'desc'));
			const snapshot = await getDocs(q);
			submissions = snapshot.docs.map((entry) => buildDoc(entry.id, entry.data()));

			// Find the most recent timestamp across all docs (submittedAt or updatedAt)
			let maxMs = 0;
			for (const entry of snapshot.docs) {
				const data = entry.data();
				for (const field of ['submittedAt', 'updatedAt']) {
					const val = data[field];
					if (val && typeof val === 'object' && 'toDate' in val) {
						const ms = (val as { toDate: () => Date }).toDate().getTime();
						if (ms > maxMs) maxMs = ms;
					}
				}
			}
			lastUpdatedDate = maxMs
				? new Date(maxMs).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
				: '';
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

	function printAliyotList() {
		window.print();
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
		// Only keep primary flags for parshiot that are actually checked
		const primaryParshiot = leiningParshiot.filter((parsha) => currentDraft.primaryParshiot[parsha]);

		try {
			await updateDoc(doc(db, 'aliyot-signups', selectedId), {
				englishName: currentDraft.englishName.trim(),
				hebrewGivenName: currentDraft.hebrewGivenName.trim(),
				hebrewFatherName: currentDraft.hebrewFatherName.trim(),
				tribe: currentDraft.tribe,
				alumni: currentDraft.alumni,
				davening: {
					canDaven: currentDraft.canDaven,
					portions: daveningPortions
				},
				leining: {
					ability: currentDraft.leiningAbility,
					barMitzvahParsha: currentDraft.barMitzvahParsha.trim(),
					parshiot: leiningParshiot,
					primaryParshiot
				},
				updatedAt: serverTimestamp()
			});

			submissions = submissions.map((record) =>
				record.id === selectedId
					? {
							...record,
							englishName: currentDraft.englishName.trim(),
							hebrewGivenName: currentDraft.hebrewGivenName.trim(),
							hebrewFatherName: currentDraft.hebrewFatherName.trim(),
							tribe: currentDraft.tribe,
							alumni: currentDraft.alumni,
							davening: { canDaven: currentDraft.canDaven, portions: daveningPortions },
							leining: {
								ability: currentDraft.leiningAbility,
								barMitzvahParsha: currentDraft.barMitzvahParsha.trim(),
								parshiot: leiningParshiot,
								primaryParshiot
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

	async function deleteRecord(id: string) {
		const record = submissions.find((r) => r.id === id);
		if (!record) return;
		const confirmed = window.confirm(`Delete "${record.englishName}"? This cannot be undone.`);
		if (!confirmed) return;
		try {
			await deleteDoc(doc(db, 'aliyot-signups', id));
			submissions = submissions.filter((r) => r.id !== id);
			if (selectedId === id) {
				selectedId = submissions[0]?.id ?? '';
				const next = submissions.find((r) => r.id === selectedId);
				draft = next ? (loadDraft(next), draft) : null;
			}
			statusMessage = `Deleted "${record.englishName}".`;
		} catch (error) {
			console.error('Failed to delete:', error);
			statusMessage = 'Delete failed. Check Firestore permissions.';
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
		<a href={resolve('/aliyot-signup/')} class="back-link">← Aliyot Signup</a>
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
						<h2>Submissions ({visibleSubmissions.length} shown / {submissions.length} total)</h2>
						<input
							class="search-input"
							type="search"
							placeholder="Search names…"
							bind:value={searchQuery}
						/>
						<label class="checkbox-row filter-toggle">
							<input type="checkbox" bind:checked={showAlumni} />
							Show alumni
						</label>
						{#if loading}
							<p>Loading…</p>
						{:else if visibleSubmissions.length === 0}
							<p>No active submissions found.</p>
						{:else}
							<ul>
								{#each visibleSubmissions as item}
									<li class="list-item-row">
										<button
											class:selected={item.id === selectedId}
											class:alumni={item.alumni}
											class="list-item"
											onclick={() => selectRecord(item.id)}
										>
											<div class="name-row">
												<div class="name">{item.englishName || '(No name)'}</div>
												{#if item.alumni}
													<span class="alumni-badge">Alumnus</span>
												{/if}
											</div>
											<div class="meta">{item.tribe || 'No tribe'} • {item.submittedAtLabel}</div>
										</button>
										<button
											class="delete-btn"
											type="button"
											title="Delete"
											onclick={() => deleteRecord(item.id)}
										>✕</button>
									</li>
								{/each}
							</ul>
						{/if}

				<div class="parsha-lookup">
					<h3>Leiners Lookup</h3>
					<p class="info-text">View who can lein for each parsha with week-by-week navigation.</p>
					<a href={resolve('/admin')} class="view-leiners-btn">View Leiners →</a>
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
							<div class="hebrew-edit-row" dir="rtl">
								<input type="text" bind:value={draft.hebrewGivenName} placeholder="Hebrew name" />
								<span class="hebrew-ben-edit">בן</span>
								<input type="text" bind:value={draft.hebrewFatherName} placeholder="Father's Hebrew name" />
							</div>
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
							<input type="checkbox" bind:checked={draft.alumni} />
							Mark as alumnus
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
								<option value="bar_mitzvah_only">Bar Mitzvah parsha only</option>
								<option value="can_help">I can lein specific parshiot</option>
								<option value="when_asked">I can lein when asked</option>
								<option value="comfortable">Comfortable / regular</option>
							</select>
						</label>
						<label>
							Bar/Bat Mitzvah Parsha
							<select bind:value={draft.barMitzvahParsha}>
								<option value="">-- Select parsha --</option>
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
										<div class="parsha-row">
											<label class="checkbox-row">
												<input type="checkbox" bind:checked={draft.leiningParshiot[p]}
													onchange={() => { if (!draft!.leiningParshiot[p]) draft!.primaryParshiot[p] = false; }} />
												{p}
											</label>
											{#if draft.leiningParshiot[p]}
												<button
													type="button"
													class="primary-star"
													class:is-primary={draft.primaryParshiot[p]}
													title={draft.primaryParshiot[p] ? 'Primary leiner' : 'Mark as primary'}
													onclick={() => { draft!.primaryParshiot[p] = !draft!.primaryParshiot[p]; }}
												>★</button>
											{/if}
										</div>
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

		<section class="card print-panel">
			<div class="print-header">
				<div>
					<h2>Commons Minyan Aliyah List</h2>
					<p>Last updated: {lastUpdatedDate || '—'}</p>
				</div>
				<button type="button" onclick={printAliyotList}>Print list</button>
			</div>

			<div class="aliyot-grid">
				{#each aliyotByTribe as group}
					<section class="aliyot-tribe" class:full-width={group.tribe === 'Yisrael'}>
						<h3>{group.tribe}</h3>
						{#if group.people.length === 0}
							<p class="empty-tribe">No active names.</p>
						{:else}
							<ul>
								{#each group.people as person}
									<li>
										<div class="print-row">
											<div class="print-name">{person.englishName}</div>
											<div class="print-hebrew" dir="rtl">
												<span class="hebrew-name-part">{person.hebrewGivenName || '—'}</span>
												<span class="hebrew-ben">בן</span>
												<span class="hebrew-name-part">{person.hebrewFatherName || '—'}</span>
												{#if tribeSuffix(person.tribe)}
													<span class="hebrew-suffix">{tribeSuffix(person.tribe)}</span>
												{/if}
											</div>
										</div>
									</li>
								{/each}
								</ul>
						{/if}
					</section>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.page {
		font-family: 'Frank Ruhl Libre', serif;
		background: #f7f7f2;
		color: #222;
		min-height: 100vh;
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

	.filter-toggle {
		margin: 6px 0 12px;
		font-weight: 600;
	}

	.search-input {
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
		font-size: 14px;
		padding: 7px 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		margin-bottom: 6px;
	}

	.search-input:focus {
		outline: 2px solid #1976d2;
		border-color: #1976d2;
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

	.info-text {
		margin: 0;
		font-size: 14px;
		color: #555;
	}

	.view-leiners-btn {
		display: block;
		text-align: center;
		padding: 12px;
		background: #4caf50;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-weight: 600;
		transition: background 0.2s;
	}

	.view-leiners-btn:hover {
		background: #388e3c;
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
		flex: 1;
		min-width: 0;
	}

	.list-item-row {
		display: flex;
		align-items: stretch;
		gap: 6px;
	}

	.delete-btn {
		flex-shrink: 0;
		background: transparent;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		color: #999;
		font-size: 13px;
		cursor: pointer;
		padding: 0 8px;
		line-height: 1;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.delete-btn:hover {
		background: #fdecea;
		border-color: #e53935;
		color: #e53935;
	}

	.list-item.alumni {
		opacity: 0.7;
	}

	.list-item.selected {
		border-color: #1976d2;
		background: #e8f1fd;
	}

	.name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.name {
		font-weight: 700;
	}

	.alumni-badge {
		background: #e0e0e0;
		color: #555;
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.meta {
		font-size: 14px;
		color: #555;
	}

	.print-panel {
		margin-top: 16px;
	}

	.print-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 14px;
	}

	.print-header h2 {
		margin: 0 0 4px;
	}

	.print-header p {
		margin: 0;
		color: #555;
	}

	.print-header button {
		background: #1976d2;
		color: white;
		border: none;
		padding: 10px 14px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
	}

	.aliyot-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.aliyot-tribe.full-width {
		grid-column: 1 / -1;
	}

	.aliyot-tribe.full-width ul {
		display: block;
		columns: 2;
		column-gap: 38px;
	}

	.aliyot-tribe.full-width li {
		break-inside: avoid;
	}

	.aliyot-tribe {
		border: 1px solid #dcdcdc;
		border-radius: 6px;
		padding: 12px;
		background: #fcfcfb;
	}

	.aliyot-tribe h3 {
		margin: 0 0 10px;
		font-size: 18px;
	}

	.aliyot-tribe ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}

	.aliyot-tribe li {
		padding-bottom: 8px;
		border-bottom: 1px dashed #e3e3e3;
	}

	.print-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.print-name {
		font-weight: 700;
		font-size: 18px;
		flex-shrink: 0;
	}

	.print-hebrew {
		font-size: 18px;
		color: #555;
		font-weight: 700;
		line-height: 1.35;
		text-align: right;
	}

	.hebrew-name-part,
	.hebrew-suffix {
		font-weight: 700;
	}

	.hebrew-ben,
	.hebrew-ben-edit {
		font-weight: 400;
		font-size: 0.82em;
		padding: 0 0.15em;
	}

	.hebrew-edit-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.hebrew-edit-row input {
		flex: 1 1 0;
		min-width: 0;
	}

	.empty-tribe {
		margin: 0;
		color: #777;
		font-style: italic;
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

	.parsha-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.parsha-row .checkbox-row {
		flex: 1;
		min-width: 0;
	}

	.primary-star {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 16px;
		color: #ccc;
		padding: 0 2px;
		line-height: 1;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.primary-star:hover {
		color: #f59e0b;
	}

	.primary-star.is-primary {
		color: #f59e0b;
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

		.aliyot-grid {
			grid-template-columns: 1fr;
		}
	}

	@media print {
		.header,
		.top-actions,
		.admin-grid > .list-panel,
		.admin-grid > :not(.print-panel) {
			display: none !important;
		}

		.page {
			max-width: none;
			padding: 0;
			background: white;
		}

		.print-panel {
			border: none;
			margin: 0;
			padding: 0;
		}

		.print-header button {
			display: none;
		}

		.aliyot-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.print-header h2 {
			font-size: 16px;
			margin-bottom: 2px;
		}

		.print-header p {
			font-size: 11px;
			margin: 0;
		}

		.aliyot-tribe {
			border: 2px solid #333;
			border-radius: 0;
			padding: 8px;
			background: white;
		}

		.aliyot-tribe h3 {
			font-size: 13px;
			font-weight: 900;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			border-bottom: 2px solid #333;
			padding-bottom: 4px;
			margin-bottom: 6px;
		}

		.aliyot-tribe ul {
			gap: 0;
		}

		.aliyot-tribe.full-width ul {
			column-gap: 28px;
		}

		.aliyot-tribe li {
			padding: 4px 0;
			border-bottom: 1px solid #ccc;
		}

		.aliyot-tribe li:last-child {
			border-bottom: none;
		}

		.print-name {
			font-size: 11px;
		}

		.print-hebrew {
			font-size: 13px;
			color: #000;
			font-weight: 700;
		}

		.hebrew-name-part,
		.hebrew-ben,
		.hebrew-suffix {
			color: #000;
		}
	}
</style>
