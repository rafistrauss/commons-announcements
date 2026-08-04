<script lang="ts">
	import { onMount } from 'svelte';
	import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { base, resolve } from '$app/paths';

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

	type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

	let englishName = '';
	let email = '';
	let hebrewGivenName = '';
	let hebrewFatherName = '';
	let tribe: 'Kohen' | 'Levi' | 'Yisrael' | '' = '';
	let showHebrewKeyboard = false;
	let activeHebrewField: 'given' | 'father' = 'given';

	let canlDaven = false;
	let daveningPortions: Record<string, boolean> = {};
	for (const p of DAVENING_PORTIONS) daveningPortions[p] = false;

	let leiiningAbility: 'none' | 'bar_mitzvah_only' | 'can_help' | 'when_asked' | 'comfortable' = 'none';
	let barMitzvahParsha = '';
	let canLeinParshiot: Record<string, boolean> = {};
	for (const p of PARSHIOT) canLeinParshiot[p] = false;
	let lastAutoSelectedBarMitzvahParsha = '';

	let status: SubmitStatus = 'idle';
	let errorMessage = '';
	let wasUpdate = false;
	let showLeiiningDetails = false;
	let showParshiotPicker = false;
	let hebrewName = '';
	const HEBREW_KEYS = [
		'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ',
		'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת', 'ך', 'ם', 'ן', 'ף', 'ץ'
	];

	$: showLeiiningDetails = leiiningAbility !== 'none';
	$: showParshiotPicker =
		leiiningAbility === 'can_help' || leiiningAbility === 'when_asked' || leiiningAbility === 'comfortable';
	$: hebrewName = `${hebrewGivenName.trim()} בן ${hebrewFatherName.trim()}`.trim();
	$: if (!barMitzvahParsha) {
		lastAutoSelectedBarMitzvahParsha = '';
	}
	$: if (barMitzvahParsha && barMitzvahParsha !== lastAutoSelectedBarMitzvahParsha) {
		canLeinParshiot[barMitzvahParsha] = true;
		lastAutoSelectedBarMitzvahParsha = barMitzvahParsha;
	}

	function appendHebrewCharacter(char: string) {
		if (activeHebrewField === 'given') {
			hebrewGivenName += char;
			return;
		}
		hebrewFatherName += char;
	}

	function backspaceHebrewCharacter() {
		if (activeHebrewField === 'given') {
			hebrewGivenName = hebrewGivenName.slice(0, -1);
			return;
		}
		hebrewFatherName = hebrewFatherName.slice(0, -1);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!englishName.trim()) {
			errorMessage = 'Please enter your English name.';
			return;
		}
		if (!email.trim()) {
			errorMessage = 'Please enter an email address so you can update your information later.';
			return;
		}
		if (!hebrewGivenName.trim() || !hebrewFatherName.trim()) {
			errorMessage = 'Please enter your Hebrew name and your father\'s Hebrew name.';
			return;
		}
		if (!tribe) {
			errorMessage = 'Please select Kohen, Levi, or Yisrael.';
			return;
		}
		status = 'submitting';
		errorMessage = '';

		try {
			const selectedDaveningPortions = DAVENING_PORTIONS.filter(p => daveningPortions[p]);
			const selectedParshiot = PARSHIOT.filter(p => canLeinParshiot[p]);
			const normalizedEmail = email.trim().toLowerCase();
			const payload = {
				englishName: englishName.trim(),
				email: normalizedEmail,
				hebrewName,
				hebrewGivenName: hebrewGivenName.trim(),
				hebrewFatherName: hebrewFatherName.trim(),
				tribe,
				davening: {
					canDaven: canlDaven,
					portions: selectedDaveningPortions
				},
				leining: {
					ability: leiiningAbility,
					barMitzvahParsha: leiiningAbility !== 'none' ? barMitzvahParsha : '',
					parshiot: showParshiotPicker ? selectedParshiot : []
				},
				updatedAt: serverTimestamp()
			};

			const existingSignupQuery = query(
				collection(db, 'aliyot-signups'),
				where('email', '==', normalizedEmail),
				limit(1)
			);
			const existingSignupSnapshot = await getDocs(existingSignupQuery);

			if (existingSignupSnapshot.empty) {
				wasUpdate = false;
				await addDoc(collection(db, 'aliyot-signups'), {
					...payload,
					submittedAt: serverTimestamp()
				});
			} else {
				wasUpdate = true;
				const existingDoc = existingSignupSnapshot.docs[0];
				await updateDoc(doc(db, 'aliyot-signups', existingDoc.id), payload);
			}
			status = 'success';
		} catch (err) {
			console.error('Error saving to Firebase:', err);
			status = 'error';
			errorMessage = 'Something went wrong. Please try again.';
		}
	}

	function resetForm() {
		englishName = '';
		email = '';
		hebrewGivenName = '';
		hebrewFatherName = '';
		tribe = '';
		canlDaven = false;
		for (const p of DAVENING_PORTIONS) daveningPortions[p] = false;
		leiiningAbility = 'none';
		barMitzvahParsha = '';
		lastAutoSelectedBarMitzvahParsha = '';
		for (const p of PARSHIOT) canLeinParshiot[p] = false;
		status = 'idle';
		errorMessage = '';
		wasUpdate = false;
	}
</script>

<svelte:head>
	<title>Aliyot & Minyan Signup – Commons Minyan</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<div class="header-links">
			<a href="{base}/" class="back-link">← Announcements</a>
			<a href={resolve('/aliyot-signup/admin')} class="admin-link">Admin sign-in</a>
		</div>
		<h1>Fair Lawn Commons Minyan</h1>
		<h2>Aliyot & Minyan Participation</h2>
		<p class="tagline">
			Our Minyan thrives because of <em>you</em>. By sharing your information, you help us plan
			meaningful davening, ensure Torah readings, and build a community where everyone can
			contribute. Every skill—big or small—makes our Minyan stronger. Thank you for being part of
			what makes our Minyan special! 🙏
		</p>
	</header>

	{#if status === 'success'}
		<div class="success-card">
			<div class="success-icon">✅</div>
			<h2>Thank you, {englishName}!</h2>
			<p>
				{#if wasUpdate}
					Your information has been updated.
				{:else}
					Your information has been saved.
				{/if}
				We'll be in touch when there's an opportunity for you to participate.
			</p>
			<button class="btn btn-primary" onclick={resetForm}>Submit Another Response</button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="signup-form">

			<!-- Personal Info -->
			<section class="form-section">
				<h2 class="section-title">👤 Your Information</h2>

				<div class="field">
					<label for="english-name">English Name <span class="required">*</span></label>
					<input
						id="english-name"
						type="text"
						bind:value={englishName}
						placeholder="e.g. David Cohen"
						required
					/>
				</div>

				<div class="field">
					<label for="email">Email <span class="required">*</span></label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="e.g. name@example.com"
						autocomplete="email"
						required
					/>
					<p class="field-hint">Use this email later to update your submission.</p>
				</div>

				<div class="field">
					<p class="field-label">Hebrew Name <span class="required">*</span></p>
					<div class="hebrew-name-row" dir="rtl">
						<div class="field hebrew-name-field">
							<label for="hebrew-given-name">Hebrew Name</label>
							<input
								id="hebrew-given-name"
								type="text"
								bind:value={hebrewGivenName}
								placeholder="e.g. דוד"
								dir="rtl"
								onfocus={() => (activeHebrewField = 'given')}
								required
							/>
						</div>
						<div class="hebrew-ben-separator" aria-hidden="true">בן</div>
						<div class="field hebrew-name-field">
							<label for="hebrew-father-name">Father's Hebrew Name</label>
							<input
								id="hebrew-father-name"
								type="text"
								bind:value={hebrewFatherName}
								placeholder="e.g. אברהם"
								dir="rtl"
								onfocus={() => (activeHebrewField = 'father')}
								required
							/>
						</div>
					</div>
					<div class="hebrew-name-preview">
						<div class="hebrew-name-preview-label">Final Hebrew Name (for Aliyot)</div>
						<div class="hebrew-name-preview-value" dir="rtl">{hebrewName || '—'}</div>
					</div>
					<button type="button" class="hebrew-kb-toggle" onclick={() => (showHebrewKeyboard = !showHebrewKeyboard)}>
						{showHebrewKeyboard ? 'Hide Hebrew keyboard' : 'Show Hebrew keyboard (optional)'}
					</button>
					{#if showHebrewKeyboard}
						<div class="hebrew-keyboard" dir="rtl">
							{#each HEBREW_KEYS as key}
								<button type="button" class="hebrew-key" onclick={() => appendHebrewCharacter(key)}>{key}</button>
							{/each}
							<button type="button" class="hebrew-key wide" onclick={() => appendHebrewCharacter(' ')}>Space</button>
							<button type="button" class="hebrew-key wide" onclick={backspaceHebrewCharacter}>⌫</button>
						</div>
					{/if}
				</div>

				<div class="field">
					<p class="field-label">Tribe <span class="required">*</span></p>
					<div class="radio-group">
						{#each ['Kohen', 'Levi', 'Yisrael'] as t}
							<label class="radio-option">
								<input type="radio" name="tribe" value={t} bind:group={tribe} />
								{t}
							</label>
						{/each}
					</div>
				</div>
			</section>

			<!-- Davening -->
			<section class="form-section">
				<h2 class="section-title">🎶 Davening / Leading Tefillah</h2>
				<p class="section-desc">
					Leading davening is one of the most meaningful ways to contribute to the Minyan.
					Even if you only know part of a service, we'd love your help. Morning minyanim are
					only occasional, so Shacharit opportunities are relatively rare.
				</p>

				<label class="checkbox-main">
					<input type="checkbox" bind:checked={canlDaven} />
					<span>I'm able to lead davening (daven for the amud)</span>
				</label>

				{#if canlDaven}
					<div class="sub-options">
						<p class="sub-label">Which portions can you lead?</p>
						{#each Object.entries(DAVENING_PORTION_GROUPS) as [groupName, portions]}
							<div class="davening-group">
								<p class="davening-group-title">{groupName}</p>
								{#each portions as portion}
									<label class="checkbox-option">
										<input type="checkbox" bind:checked={daveningPortions[portion.value]} />
										{portion.label}
									</label>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Leining -->
			<section class="form-section">
				<h2 class="section-title">📜 Torah Reading (Leining)</h2>
				<p class="section-desc">
					Every Shabbat and Yom Tov, we need someone to read from the Torah. Even reading a
					single aliyah makes a huge difference. In most cases, saying you can lein means
					committing to lein the <strong>1st aliyah</strong> unless arranged otherwise.
				</p>

				<div class="field">
					<p class="field-label">What best describes your leining ability?</p>
					<div class="radio-group vertical">
						<label class="radio-option">
							<input type="radio" name="leining" value="none" bind:group={leiiningAbility} />
							I don't lein
						</label>
						<label class="radio-option">
							<input type="radio" name="leining" value="bar_mitzvah_only" bind:group={leiiningAbility} />
							I know my Bar Mitzvah parsha only
						</label>
						<label class="radio-option">
							<input type="radio" name="leining" value="can_help" bind:group={leiiningAbility} />
							I can lein specific parshiot
						</label>
						<label class="radio-option">
							<input type="radio" name="leining" value="when_asked" bind:group={leiiningAbility} />
							I can lein when asked
						</label>
						<label class="radio-option">
							<input type="radio" name="leining" value="comfortable" bind:group={leiiningAbility} />
							I'm comfortable leining and happy to be called on regularly
						</label>
					</div>
				</div>

				{#if showLeiiningDetails}
					<div class="sub-options">
						<div class="field">
							<label for="bm-parsha">Bar / Bat Mitzvah Parsha</label>
							<select id="bm-parsha" bind:value={barMitzvahParsha}>
								<option value="">-- Select parsha --</option>
								{#each PARSHIOT as p}
									<option value={p}>{p}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}

				{#if showParshiotPicker}
					<div class="sub-options">
						<p class="sub-label">Which parshiot can you lein? (check all that apply)</p>
						<div class="parshiot-grid">
							{#each PARSHIOT as parsha}
								<label class="checkbox-option">
									<input type="checkbox" bind:checked={canLeinParshiot[parsha]} />
									{parsha}
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</section>

			{#if errorMessage}
				<p class="error-msg">{errorMessage}</p>
			{/if}

			<button type="submit" class="btn btn-primary btn-submit" disabled={status === 'submitting'}>
				{status === 'submitting' ? 'Saving…' : 'Submit'}
			</button>
		</form>
	{/if}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap');

	.page {
		font-family: 'Frank Ruhl Libre', serif;
		background: #f5f5f0;
		color: #222;
		min-height: 100vh;
		max-width: 720px;
		margin: 0 auto;
		padding: 20px 16px 60px;
	}

	.page-header {
		text-align: center;
		margin-bottom: 32px;
	}

	.back-link {
		display: inline-block;
		color: #2196f3;
		text-decoration: none;
		font-size: 16px;
	}
	.back-link:hover { text-decoration: underline; }

	.header-links {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		margin-bottom: 12px;
	}

	.admin-link {
		color: #666;
		font-size: 13px;
		text-decoration: none;
		font-weight: 500;
	}

	.admin-link:hover {
		color: #333;
		text-decoration: underline;
	}

	h1 {
		font-size: 32px;
		font-weight: 700;
		margin: 0 0 12px;
	}

	.tagline {
		font-size: 17px;
		line-height: 1.6;
		color: #444;
		max-width: 600px;
		margin: 0 auto;
	}

	.signup-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-section {
		background: white;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		font-size: 22px;
		font-weight: 700;
		margin: 0;
		border-bottom: 2px solid #eee;
		padding-bottom: 8px;
	}

	.section-desc {
		font-size: 15px;
		color: #555;
		margin: 0;
		line-height: 1.5;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label, .field-label {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}

	.field-hint {
		font-size: 13px;
		color: #777;
		margin: 2px 0 0;
	}

	.hebrew-name-row {
		display: flex;
		align-items: flex-end;
		gap: 10px;
	}

	.hebrew-name-field {
		flex: 1 1 0;
		min-width: 0;
	}

	.hebrew-ben-separator {
		font-size: 24px;
		font-weight: 700;
		line-height: 1;
		padding-bottom: 9px;
		color: #333;
	}

	.hebrew-name-preview {
		background: #f7f2e9;
		border: 1px solid #d8c6a3;
		border-radius: 6px;
		padding: 10px 12px;
	}

	.hebrew-name-preview-label {
		font-size: 13px;
		color: #6b5d42;
		margin-bottom: 6px;
		font-weight: 700;
	}

	.hebrew-name-preview-value {
		font-size: 24px;
		font-weight: 700;
		color: #2b2b2b;
		min-height: 30px;
		text-align: center;
	}

	input[type="text"],
	select {
		font-family: inherit;
		font-size: 16px;
		padding: 8px 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		width: 100%;
		box-sizing: border-box;
	}

	input[type="text"]:focus,
	select:focus {
		outline: 2px solid #2196f3;
		border-color: #2196f3;
	}

	.required { color: #d32f2f; }

	.radio-group {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.radio-group.vertical {
		flex-direction: column;
		gap: 8px;
	}

	.radio-option, .checkbox-option, .checkbox-main {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
		cursor: pointer;
	}

	.checkbox-main {
		font-weight: 600;
	}

	.sub-options {
		background: #f9f9f9;
		border-left: 3px solid #2196f3;
		padding: 12px 16px;
		border-radius: 0 4px 4px 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.sub-label {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: #333;
	}

	.parshiot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 8px;
	}

	.hebrew-kb-toggle {
		align-self: flex-start;
		border: 1px solid #bdbdbd;
		background: #f4f4f4;
		color: #333;
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
	}

	.hebrew-kb-toggle:hover {
		background: #ececec;
	}

	.hebrew-keyboard {
		display: grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		gap: 6px;
		background: #f9f9f9;
		border: 1px solid #ddd;
		padding: 10px;
		border-radius: 6px;
	}

	.hebrew-key {
		font-family: 'Frank Ruhl Libre', serif;
		font-size: 18px;
		padding: 8px 0;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}

	.hebrew-key:hover {
		background: #f2f2f2;
	}

	.hebrew-key.wide {
		grid-column: span 2;
		font-size: 14px;
		font-family: inherit;
	}

	.davening-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px 0;
	}

	.davening-group + .davening-group {
		border-top: 1px solid #e1e1e1;
	}

	.davening-group-title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: #333;
	}

	.btn {
		font-family: inherit;
		font-size: 18px;
		font-weight: 700;
		padding: 12px 32px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.btn-primary {
		background: #2196f3;
		color: white;
	}

	.btn-primary:hover:not(:disabled) { background: #1976d2; }
	.btn-primary:disabled { background: #90caf9; cursor: default; }

	.btn-submit {
		align-self: center;
		min-width: 200px;
	}

	.error-msg {
		color: #d32f2f;
		font-size: 15px;
		text-align: center;
		margin: 0;
	}

	.success-card {
		background: white;
		border: 2px solid #4caf50;
		border-radius: 8px;
		padding: 40px 32px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.success-icon { font-size: 48px; }

	.success-card h2 {
		font-size: 26px;
		margin: 0;
	}

	.success-card p {
		font-size: 17px;
		color: #444;
		max-width: 400px;
		margin: 0;
	}

	@media (max-width: 700px) {
		.hebrew-ben-separator {
			padding-bottom: 0;
		}

		.hebrew-keyboard {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}
</style>
