<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { base } from '$app/paths';

	const PARSHIOT = [
		'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
		'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
		'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות',
		'קדושים', 'אמור', 'בהר', 'בחקותי', 'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חקת',
		'בלק', 'פינחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא',
		'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
	];

	const DAVENING_PORTIONS = [
		'Kabbalat Shabbat & Maariv',
		'Shabbat Shacharit',
		'Shabbat Mussaf',
		'Shabbat Mincha',
		'Yom Tov Shacharit',
		'Yom Tov Mussaf',
		'Yom Tov Mincha',
		'Yom Tov Maariv',
		'Maariv (weeknight)'
	];

	type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

	let englishName = '';
	let hebrewName = '';
	let tribe: 'Kohen' | 'Levi' | 'Yisrael' | '' = '';

	let canlDaven = false;
	let daveningPortions: Record<string, boolean> = {};
	for (const p of DAVENING_PORTIONS) daveningPortions[p] = false;

	let leiiningAbility: 'none' | 'bar_mitzvah_only' | 'can_help' | 'comfortable' = 'none';
	let barMitzvahParasha = '';
	let canLeinParshiot: Record<string, boolean> = {};
	for (const p of PARSHIOT) canLeinParshiot[p] = false;

	let status: SubmitStatus = 'idle';
	let errorMessage = '';

	$: showLeiiningDetails = leiiningAbility !== 'none';
	$: showParshiotPicker = leiiningAbility === 'can_help' || leiiningAbility === 'comfortable';

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!englishName.trim()) {
			errorMessage = 'Please enter your English name.';
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

			await addDoc(collection(db, 'aliyot-signups'), {
				englishName: englishName.trim(),
				hebrewName: hebrewName.trim(),
				tribe,
				davening: {
					canDaven: canlDaven,
					portions: selectedDaveningPortions
				},
				leining: {
					ability: leiiningAbility,
					barMitzvahParasha: leiiningAbility !== 'none' ? barMitzvahParasha : '',
					parshiot: showParshiotPicker ? selectedParshiot : []
				},
				submittedAt: serverTimestamp()
			});
			status = 'success';
		} catch (err) {
			console.error('Error saving to Firebase:', err);
			status = 'error';
			errorMessage = 'Something went wrong. Please try again.';
		}
	}

	function resetForm() {
		englishName = '';
		hebrewName = '';
		tribe = '';
		canlDaven = false;
		for (const p of DAVENING_PORTIONS) daveningPortions[p] = false;
		leiiningAbility = 'none';
		barMitzvahParasha = '';
		for (const p of PARSHIOT) canLeinParshiot[p] = false;
		status = 'idle';
		errorMessage = '';
	}
</script>

<svelte:head>
	<title>Aliyot & Minyan Signup – Commons Minyan</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<a href="{base}/" class="back-link">← Announcements</a>
		<h1>Aliyot & Minyan Participation</h1>
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
			<p>Your information has been saved. We'll be in touch when there's an opportunity for you to participate.</p>
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
					<label for="hebrew-name">Hebrew Name</label>
					<input
						id="hebrew-name"
						type="text"
						bind:value={hebrewName}
						placeholder="e.g. דוד בן אברהם"
						dir="rtl"
					/>
					<p class="field-hint">Used for Aliyot blessings</p>
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
					Even if you only know part of a service, we'd love your help!
				</p>

				<label class="checkbox-main">
					<input type="checkbox" bind:checked={canlDaven} />
					<span>I'm able to lead davening (daven for the amud)</span>
				</label>

				{#if canlDaven}
					<div class="sub-options">
						<p class="sub-label">Which portions can you lead?</p>
						{#each DAVENING_PORTIONS as portion}
							<label class="checkbox-option">
								<input type="checkbox" bind:checked={daveningPortions[portion]} />
								{portion}
							</label>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Leining -->
			<section class="form-section">
				<h2 class="section-title">📜 Torah Reading (Leining)</h2>
				<p class="section-desc">
					Every Shabbat and Yom Tov, we need someone to read from the Torah. Even reading a
					single aliyah makes a huge difference. Don't be shy—let us know what you can do!
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
							I know my Bar Mitzvah parasha only
						</label>
						<label class="radio-option">
							<input type="radio" name="leining" value="can_help" bind:group={leiiningAbility} />
							I can help when asked (specific parshiot)
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
							<label for="bm-parasha">Bar / Bat Mitzvah Parasha</label>
							<select id="bm-parasha" bind:value={barMitzvahParasha}>
								<option value="">-- Select parasha --</option>
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
							{#each PARSHIOT as parasha}
								<label class="checkbox-option">
									<input type="checkbox" bind:checked={canLeinParshiot[parasha]} />
									{parasha}
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

	:global(body) {
		font-family: 'Frank Ruhl Libre', serif;
		margin: 0;
		padding: 0;
		background: #f5f5f0;
		color: #222;
	}

	.page {
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
		margin-bottom: 12px;
		color: #2196f3;
		text-decoration: none;
		font-size: 16px;
	}
	.back-link:hover { text-decoration: underline; }

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
</style>
