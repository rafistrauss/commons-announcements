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
	import { getParshaForWeek } from '$lib/parsha';

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

	// The five Chumashim, each a contiguous slice of PARSHIOT (בראשית–ויחי, שמות–פקודי,
	// ויקרא–בחקתי, במדבר–מסעי, דברים–וזאת הברכה) — used to print a separate leining
	// coverage sheet per sefer.
	const SEFARIM = [
		{ name: 'בראשית', parshiot: PARSHIOT.slice(0, 12) },
		{ name: 'שמות', parshiot: PARSHIOT.slice(12, 23) },
		{ name: 'ויקרא', parshiot: PARSHIOT.slice(23, 33) },
		{ name: 'במדבר', parshiot: PARSHIOT.slice(33, 43) },
		{ name: 'דברים', parshiot: PARSHIOT.slice(43, 54) }
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

	const YOM_TOV_PAGES = [
		{ label: 'Rosh Hashana', href: '/roshhashana' },
		{ label: 'Pesach', href: '/pesach' },
		{ label: 'Shavuot', href: '/shavuot' },
		{ label: 'Shmini Atzeret / Simchat Torah', href: '/shminiatzeret' }
	] as const;

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
	let weekOffset = 1;
	let currentParsha = '';
	let currentDate = '';

	type View = 'parsha' | 'all-parshiot' | 'leining-print' | 'davening-print';
	let activeView: View = 'parsha';

	function printCurrentView() {
		window.print();
	}

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

	$: allParshiotWithLeiners = PARSHIOT.map((p) => ({
		parsha: p,
		leiners: submissions.filter((record) => canLeinParsha(record, p))
	}));

	$: leiningBySefer = SEFARIM.map((sefer) => ({
		name: sefer.name,
		parshiot: sefer.parshiot.map((p) => ({
			parsha: p,
			leiners: submissions.filter((record) => canLeinParsha(record, p))
		}))
	}));

	$: daveningByPortion = Object.entries(DAVENING_PORTION_GROUPS).map(([groupName, portions]) => ({
		groupName,
		portions: portions.map((portion) => ({
			label: portion.label,
			people: submissions
				.filter(
					(record) =>
						!record.alumni && record.davening.canDaven && record.davening.portions.includes(portion.value)
				)
				.slice()
				.sort((a, b) => a.englishName.localeCompare(b.englishName))
		}))
	}));

	$: currentParshaLeiners = submissions.filter((record) => canLeinParsha(record, selectedParsha));

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
			const { parsha, englishDate } = getParshaForWeek(offset);
			currentParsha = parsha;
			currentDate = englishDate;
			selectedParsha = currentParsha;
		} catch (error) {
			console.error('Failed to calculate parsha:', error);
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
	<header class="header noprint">
		<a href={resolve('/aliyot-signup/admin/')} class="back-link">← Admin</a>
		<h1>Leiners Lookup</h1>
		<p>View who can lein for each parsha.</p>
	</header>

	<nav class="yomtov-links noprint">
		<span class="yomtov-links-label">Yom Tov Pages:</span>
		{#each YOM_TOV_PAGES as ytPage}
			<a href={resolve(ytPage.href)} class="yomtov-link">{ytPage.label}</a>
		{/each}
	</nav>

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
		<div class="top-bar noprint">
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

		{#if statusMessage}<p class="status noprint">{statusMessage}</p>{/if}

		<div class="view-tabs noprint">
			<button
				class="tab-btn"
				class:active={activeView === 'parsha'}
				onclick={() => (activeView = 'parsha')}
			>
				Parsha Lookup
			</button>
			<button
				class="tab-btn"
				class:active={activeView === 'all-parshiot'}
				onclick={() => (activeView = 'all-parshiot')}
			>
				All Parshiot
			</button>
			<button
				class="tab-btn"
				class:active={activeView === 'leining-print'}
				onclick={() => (activeView = 'leining-print')}
			>
				Leining Sheet (Print)
			</button>
			<button
				class="tab-btn"
				class:active={activeView === 'davening-print'}
				onclick={() => (activeView = 'davening-print')}
			>
				Davening Sheet (Print)
			</button>
		</div>

		{#if activeView === 'parsha'}
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
				{:else if currentParshaLeiners.length === 0}
					<p class="no-results">No leiners found for this parsha.</p>
				{:else}
					<ul class="leiners-list">
						{#each currentParshaLeiners as person}
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
		{:else if activeView === 'all-parshiot'}
			<section class="all-parshiot">
				{#each allParshiotWithLeiners as { parsha, leiners }}
					<div class="parsha-row" class:has-leiners={leiners.length > 0}>
						<div class="parsha-row-name" dir="rtl">{parsha}</div>
						<div class="parsha-row-leiners">
							{#if leiners.length === 0}
								<span class="no-leiner">—</span>
							{:else}
								{#each leiners as person}
									<span class="leiner-chip">{person.englishName}</span>
								{/each}
							{/if}
						</div>
					</div>
				{/each}
			</section>
		{:else if activeView === 'leining-print'}
			<section class="card print-panel">
				<div class="print-header">
					<div>
						<h2>Leining Coverage by Sefer</h2>
						<p>Who can lein each parsha, grouped by Chumash. Blank rows need a leiner.</p>
					</div>
					<button type="button" class="noprint" onclick={printCurrentView}>Print list</button>
				</div>
				{#each leiningBySefer as sefer, si}
					<div class="sefer-section" class:page-break={si < leiningBySefer.length - 1}>
						<h3 dir="rtl">{sefer.name}</h3>
						<div class="all-parshiot">
							{#each sefer.parshiot as { parsha, leiners }}
								<div class="parsha-row" class:has-leiners={leiners.length > 0}>
									<div class="parsha-row-name" dir="rtl">{parsha}</div>
									<div class="parsha-row-leiners">
										{#if leiners.length === 0}
											<span class="no-leiner">No leiners yet</span>
										{:else}
											{#each leiners as person}
												<span class="leiner-chip">{person.englishName}</span>
											{/each}
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</section>
		{:else if activeView === 'davening-print'}
			<section class="card print-panel">
				<div class="print-header">
					<div>
						<h2>Davening Sign-ups</h2>
						<p>Who can lead each service, by portion.</p>
					</div>
					<button type="button" class="noprint" onclick={printCurrentView}>Print list</button>
				</div>
				{#each daveningByPortion as group}
					<div class="davening-group">
						<h3>{group.groupName}</h3>
						{#each group.portions as portion}
							<div class="davening-portion">
								<div class="davening-portion-name">{portion.label}</div>
								{#if portion.people.length === 0}
									<p class="no-results">No one signed up.</p>
								{:else}
									<ul class="davener-list">
										{#each portion.people as person}
											<li>
												{person.englishName}
												{#if person.hebrewName}
													<span class="davener-hebrew" dir="rtl">({person.hebrewName})</span>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</section>
		{/if}
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

	.view-tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.tab-btn {
		background: #e0e0e0;
		color: #444;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		transition: background 0.15s;
	}

	.tab-btn.active {
		background: #1976d2;
		color: white;
	}

	.tab-btn:hover:not(.active) {
		background: #bdbdbd;
	}

	.all-parshiot {
		display: grid;
		gap: 4px;
	}

	.parsha-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 14px;
		border-radius: 6px;
		background: #fff;
		border: 1px solid #e0e0e0;
	}

	.parsha-row.has-leiners {
		border-color: #a5d6a7;
		background: #f1f8e9;
	}

	.parsha-row-name {
		font-weight: 700;
		font-size: 17px;
		min-width: 120px;
		text-align: right;
	}

	.parsha-row-leiners {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
	}

	.leiner-chip {
		background: #1976d2;
		color: white;
		border-radius: 12px;
		padding: 3px 10px;
		font-size: 13px;
		font-weight: 600;
	}

	.no-leiner {
		color: #bbb;
		font-size: 14px;
	}

	.yomtov-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		padding: 10px 14px;
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
	}

	.yomtov-links-label {
		font-weight: 700;
		font-size: 13px;
		color: #555;
	}

	.yomtov-link {
		background: #eef4fc;
		color: #1976d2;
		border: 1px solid #bcd6f2;
		border-radius: 999px;
		padding: 4px 12px;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}

	.yomtov-link:hover {
		background: #dceafd;
	}

	.print-panel {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 20px;
	}

	.print-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 16px;
	}

	.print-header h2 {
		margin: 0 0 4px;
		font-size: 22px;
	}

	.print-header p {
		margin: 0;
		color: #555;
		font-size: 14px;
	}

	.print-header button {
		background: #1976d2;
		color: white;
		border: none;
		padding: 10px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		flex-shrink: 0;
	}

	.sefer-section {
		margin-bottom: 24px;
	}

	.sefer-section h3 {
		font-size: 20px;
		margin: 0 0 10px;
		border-bottom: 2px solid #333;
		padding-bottom: 6px;
	}

	.davening-group {
		margin-bottom: 20px;
	}

	.davening-group h3 {
		font-size: 18px;
		margin: 0 0 10px;
		border-bottom: 2px solid #333;
		padding-bottom: 6px;
	}

	.davening-portion {
		margin-bottom: 12px;
		padding: 10px 12px;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		background: #fafafa;
	}

	.davening-portion-name {
		font-weight: 700;
		font-size: 15px;
		margin-bottom: 6px;
	}

	.davener-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}

	.davener-list li {
		font-size: 14px;
	}

	.davener-hebrew {
		color: #555;
		font-size: 13px;
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

	@media print {
		@page {
			margin: 0.5in;
		}

		.noprint {
			display: none !important;
		}

		.page {
			background: white;
			max-width: none;
			padding: 0;
		}

		.print-panel {
			border: none;
			padding: 0;
		}

		.sefer-section {
			page-break-inside: avoid;
		}

		.sefer-section.page-break {
			page-break-after: always;
		}

		.davening-group {
			page-break-inside: avoid;
		}

		.parsha-row,
		.davening-portion {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.leiner-chip {
			background: white;
			color: black;
			border: 1px solid #333;
		}
	}
</style>
