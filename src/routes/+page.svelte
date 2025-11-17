<script lang="ts">
  import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	export let data;

	let html2canvas: any = null;

	onMount(async () => {
		// Dynamically import html2canvas from CDN
		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
		script.onload = () => {
			html2canvas = (window as any).html2canvas;
		};
		document.head.appendChild(script);
	});

	function weekHref(offset: number) {
		if (offset === 0) return resolve('/');
		return `?week=${offset}`;
	}
	function jumpToToday() {
		window.location.href = '/';
	}

	async function saveAsImage() {
		if (!html2canvas) {
			alert('Image capture library is still loading. Please try again in a moment.');
			return;
		}

		const element = document.querySelector('.announcement-sheet') as HTMLElement;
		if (!element) {
			alert('Could not find announcement sheet to capture.');
			return;
		}

		try {
			// Show a loading message
			const originalCursor = document.body.style.cursor;
			document.body.style.cursor = 'wait';

			// Temporarily hide navigation elements for screenshot
			const navigationElements = document.querySelectorAll('.week-navigation, .jump-to-today');
			const originalDisplayStyles: string[] = [];
			navigationElements.forEach((el, index) => {
				const htmlEl = el as HTMLElement;
				originalDisplayStyles[index] = htmlEl.style.display;
				htmlEl.style.display = 'none';
			});

			// Temporarily apply print-friendly styles to the announcement sheet
			const originalPadding = element.style.padding;
			const originalBorder = element.style.border;
			const originalMaxWidth = element.style.maxWidth;
			const originalWidth = element.style.width;
			const originalBoxSizing = element.style.boxSizing;
			
			// Force full page size (8.5in = 816px at 96 DPI)
			element.style.padding = '20px';
			element.style.border = 'none';
			element.style.maxWidth = 'none';
			element.style.width = '816px';
			element.style.boxSizing = 'border-box';

			// Wait a moment for layout to settle
			await new Promise(resolve => setTimeout(resolve, 100));

			// Capture the element as a canvas
			const canvas = await html2canvas(element, {
				scale: 2, // Higher quality
				useCORS: true,
				logging: false,
				backgroundColor: '#ffffff',
				windowWidth: 816,
				windowHeight: element.scrollHeight
			});

			// Restore original styles
			element.style.padding = originalPadding;
			element.style.border = originalBorder;
			element.style.maxWidth = originalMaxWidth;
			element.style.width = originalWidth;
			element.style.boxSizing = originalBoxSizing;
			navigationElements.forEach((el, index) => {
				(el as HTMLElement).style.display = originalDisplayStyles[index];
			});

			// Convert canvas to blob
			canvas.toBlob((blob) => {
				if (!blob) {
					alert('Failed to create image.');
					document.body.style.cursor = originalCursor;
					return;
				}

				// Create download link
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				const parshaText = data.friday.parsha.replace(/[^\u0590-\u05FF\w\s]/g, '').trim();
				const dateText = data.friday.hebrewDate.split(' ').pop();
				link.download = `shabbat-announcements-${parshaText}-${dateText}.jpg`;
				link.href = url;
				link.click();

				// Cleanup
				URL.revokeObjectURL(url);
				document.body.style.cursor = originalCursor;
			}, 'image/jpeg', 0.95);
		} catch (error) {
			console.error('Error capturing image:', error);
			alert('Failed to save image. Please try again.');
			document.body.style.cursor = 'default';
		}
	}
</script>

<svelte:head>
  <title>Commons Minyan Announcements - {data.friday.parsha} {data.friday.hebrewDate.split(' ').pop()}</title>
</svelte:head>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap');
	
	:global(body) {
		font-family: 'Frank Ruhl Libre', serif;
		margin: 0;
		padding: 15px;
		background: white;
		color: black;
	}
	
	.announcement-sheet {
		max-width: 8.5in;
		margin: 0 auto;
		padding: 20px;
		border: 2px solid #333;
		background: white;
	}
	
	.header {
		text-align: center;
		margin-bottom: 15px;
		border-bottom: 3px double #333;
		padding-bottom: 12px;
	}
	
	.title {
		font-size: 32px;
		font-weight: 700;
		margin: 0;
		letter-spacing: 1px;
	}
	
	.subtitle {
		font-size: 20px;
		margin: 8px 0 0 0;
		color: #666;
	}
	
	.parsha-section {
		text-align: center;
		margin: 12px 0;
		padding: 10px;
		background: #f9f9f9;
		border: 1px solid #ddd;
	}
	
	.parsha-title {
		font-size: 24px;
		font-weight: 700;
		margin: 0;
		direction: rtl;
	}
	
	.times-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		margin: 15px 0;
		align-items: stretch;
	}
	
	.day-section {
		border: 1px solid #ccc;
		padding: 12px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
	}
	
	.day-title {
		font-size: 20px;
		font-weight: 700;
		margin: 0 0 8px 0;
		text-align: center;
		border-bottom: 1px solid #ccc;
		padding-bottom: 6px;
	}
	
	.time-item {
		display: flex;
		justify-content: space-between;
		margin: 6px 0;
		font-size: 17px;
	}
	
	.mincha-reading {
		display: flex;
		justify-content: space-between;
		margin: 8px 0;
		font-size: 18px;
		color: #555;
		font-style: italic;
	}
	
	.reading-label {
		font-weight: 600;
	}
	
	.reading-value {
		font-weight: 400;
		direction: rtl;
	}
	
	.time-label {
		font-weight: 600;
	}
	
	.time-value {
		font-weight: 400;
	}

	[contenteditable] {
		cursor: pointer;
	}
	
	.english-date {
		font-size: 18px;
		color: #888;
		text-align: center;
		margin-bottom: 8px;
	}
	
	.hebrew-date {
		direction: rtl;
		font-size: 22px;
		color: #666;
		text-align: center;
		margin-bottom: 10px;
        font-weight: bold;
	}

	.bottom-section {
		margin-top: auto;
	}
	
	.shkia-section {
		background: #f5f5f5;
		border: 1px solid #ddd;
		padding: 10px;
		font-size: 16px;
		color: #777;
		text-align: center;
	}
	
	.shkia-title {
		font-weight: 600;
		margin-bottom: 5px;
	}
	
	.rosh-chodesh-notice {
		background: #e8f5e8;
		color: #2e7d32;
		border: 1px solid #4caf50;
		padding: 8px;
		border-radius: 4px;
		margin: 8px 0;
		text-align: center;
		font-weight: 600;
		font-size: 22px;
	}
	
	.special-liturgical-notice, .rosh-chodesh-notice-main {
		background: #e8f5e8;
		color: #2e7d32;
		border: 2px solid #4caf50;
		padding: 15px;
		border-radius: 6px;
		margin: 20px 0;
		text-align: center;
		font-weight: 700;
		font-size: 26px;
	}

	.rosh-chodesh-notice-main {
		direction: rtl;
	}
	
	.mincha-notice {
		background: #fff3e0;
		border: 2px solid #ff9800;
		padding: 15px;
		margin: 20px 0;
		font-size: 20px;
	}
	
	.notice-title {
		font-weight: 700;
		margin-bottom: 8px;
	}
	
	.liturgical-notice {
		border: 1px solid #b3d9e6;
		padding: 8px;
		margin: 8px 0;
		font-size: 18px;
		border-radius: 4px;
	}
	
	.liturgical-notice.additions {
		background: #e8f4f8;
		border-color: #4a90e2;
		font-weight: 600;
	}
	
	.liturgical-notice.omissions {
		background: #fff3e0;
		border: 1px solid #ff9800;
		color: black;
		font-weight: 600;
		border-radius: 4px;
	}	.liturgical-title {
		font-weight: 600;
		margin-bottom: 4px;
	}
	
	.tzidkatcha-notice {
		background: #fff3e0;
		border: 1px solid #ff9800;
		padding: 8px;
		margin: 8px 0;
		font-size: 18px;
		color: black;
		border-radius: 4px;
		font-weight: 600;
	}
	
	.week-navigation {
		text-align: center;
		margin: 20px 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}
	
	.nav-button {
		background: #2196f3;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 20px;
		text-decoration: none;
		display: inline-block;
	}
	
	.nav-button:hover {
		background: #1976d2;
	}

	.nav-button.save-image {
		background: #4caf50;
	}

	.nav-button.save-image:hover {
		background: #388e3c;
	}
	
	.current-week {
		font-weight: 600;
		font-size: 22px;
		color: #333;
	}
	
	@media print {
		.week-navigation,
		.jump-to-today {
			display: none !important;
		}
	}
	
	@media print {
		:global(body) {
			padding: 0;
		}
		
		.announcement-sheet {
			border: none;
			padding: 20px;
			max-width: none;
		}
	}

	.announcements-section {
		margin-top: 30px;
		padding: 20px;
		border-top: 2px solid #333;
	}

	.announcements-title {
		font-size: 24px;
		font-weight: 700;
		margin-bottom: 15px;
		text-align: center;
		color: #333;
	}

	.announcement-item {
		font-size: 18px;
		margin-bottom: 10px;
		padding: 10px;
		background: #f5f5f5;
		border-left: 4px solid #d32f2f;
		border-radius: 4px;
	}

	.kiddush-levana-notice {
		background: #e3f2fd;
		border: 2px solid #2196f3;
		padding: 15px;
		margin: 20px 0;
		border-radius: 6px;
	}

	.kiddush-levana-notice.last-chance {
		background: #fff3e0;
		border-color: #ff9800;
	}

	.kiddush-levana-notice.last-motzei-shabbos {
		background: #fff9c4;
		border-color: #fbc02d;
	}

	.kiddush-levana-title {
		font-size: 22px;
		font-weight: 700;
		margin-bottom: 8px;
		color: #1976d2;
		text-align: center;
	}

	.kiddush-levana-notice.last-chance .kiddush-levana-title {
		color: #f57c00;
	}

	.kiddush-levana-notice.last-motzei-shabbos .kiddush-levana-title {
		color: #f9a825;
	}

	.kiddush-levana-details {
		font-size: 18px;
		text-align: center;
	}

	.el-maleh-rachamim-notice {
		padding: 15px;
		margin: 20px 0;
		border-radius: 6px;
		border: 2px solid;
	}

	.el-maleh-rachamim-notice.omission {
		background: #fff3e0;
		border-color: #ff9800;
	}

	.el-maleh-rachamim-notice.warning {
		background: #fff9c4;
		border-color: #fbc02d;
	}

	.el-maleh-rachamim-title {
		font-size: 22px;
		font-weight: 700;
		margin-bottom: 8px;
		text-align: center;
	}

	.el-maleh-rachamim-notice.omission .el-maleh-rachamim-title {
		color: #f57c00;
	}

	.el-maleh-rachamim-notice.warning .el-maleh-rachamim-title {
		color: #f9a825;
	}

	.el-maleh-rachamim-details {
		font-size: 18px;
		text-align: center;
		color: #333;
	}

	/* This style sets the correct print dimensions for some reason */
	#print-area-display {
		position: absolute;
		width: 8.5in;
		height: 11in;
		margin: auto;
		/* outline: 2px dashed red; */
		box-sizing: border-box;
	}

	@media screen {
		#print-area-display {
			display: none;
		}
	}

	@media print {
		#print-area-display {
			outline: none;
		}
	}
	

</style>

<div id="print-area-display">

</div>

<div class="announcement-sheet">
	<div class="jump-to-today" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 10px;">
		<a href={resolve('/')} class="nav-button">Jump to Today</a>
		<button onclick={saveAsImage} class="nav-button save-image">Save as Image</button>
	</div>

	<div class="week-navigation">
		<a href={weekHref(data.weekOffset - 1)} class="nav-button">← Previous Week</a>
		<span class="current-week">
			{#if data.weekOffset === 0}
				This Week
			{:else if data.weekOffset === 1}
				Next Week
			{:else if data.weekOffset === -1}
				Last Week
			{:else if data.weekOffset > 0}
				{data.weekOffset} weeks ahead
			{:else}
				{Math.abs(data.weekOffset)} weeks ago
			{/if}
		</span>
		<a href={weekHref(data.weekOffset + 1)} class="nav-button">Next Week →</a>
	</div>

	<header class="header">
		<h1 class="title">Shabbat Announcements</h1>
		<p class="subtitle">Commons Minyan</p>
	</header>


	<div class="parsha-section">
		<h2 class="parsha-title">{data.friday.parsha}</h2>
	</div>

	{#if data.friday.isRoshChodesh || data.shabbat.isRoshChodesh}
		<div class="rosh-chodesh-notice-main">
			{#if data.friday.isRoshChodesh && data.shabbat.isRoshChodesh}
				ראש חודש - Friday & Shabbat
			{:else if data.friday.isRoshChodesh}
				ראש חודש - Friday
			{:else}
				ראש חודש - Shabbat
			{/if}
		</div>
	{/if}

	<!-- Special Aseret Yemei Teshuva notice styled like Rosh Chodesh box, if present -->
	{#if data.aseretYemeiTeshuvaActive}
		<div class="special-liturgical-notice" style="margin-bottom: 16px;">
			Remember to say המלך הקדוש and all the special insertions for עשרת ימי תשובה.
		</div>
	{/if}

	<div class="times-grid">
		<div class="day-section">
			<h3 class="day-title">Friday</h3>
			<div class="hebrew-date">{data.friday.hebrewDate}</div>
			<div class="english-date">{data.friday.englishDate}</div>
			<div class="time-item">
				<span class="time-label">Mincha:</span>
				<span class="time-value" contenteditable="true">{data.friday.mincha}</span>
			</div>
			{#if data.friday.minchaNotices && (data.friday.minchaNotices.additions.length > 0 || data.friday.minchaNotices.omissions.length > 0)}
				{#if data.friday.minchaNotices.additions.length > 0}
					<div class="liturgical-notice additions">
						{#each data.friday.minchaNotices.additions as notice}
							<div>{notice}</div>
						{/each}
					</div>
				{/if}
				{#if data.friday.minchaNotices.omissions.length > 0}
					<div class="liturgical-notice omissions">
						{#each data.friday.minchaNotices.omissions as notice}
							<div>No {notice}</div>
						{/each}
					</div>
				{/if}
			{/if}
			<div class="bottom-section">
				{#if data.friday.maarivNotices && (data.friday.maarivNotices.additions.length > 0 || data.friday.maarivNotices.omissions.length > 0)}
					{#if data.friday.maarivNotices.additions.length > 0}
						<div class="liturgical-notice additions">
							{#each data.friday.maarivNotices.additions as notice}
								<div>{notice}</div>
							{/each}
						</div>
					{/if}
					{#if data.friday.maarivNotices.omissions.length > 0}
						<div class="liturgical-notice omissions">
							{#each data.friday.maarivNotices.omissions as notice}
								<div>No {notice}</div>
							{/each}
						</div>
					{/if}
				{/if}
				<div class="shkia-section">
					<div class="shkia-title">Shkia</div>
					<div>{data.friday.shkia?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || 'N/A'}</div>
				</div>
			</div>
		</div>

		<div class="day-section">
			<h3 class="day-title">Shabbat</h3>
			<div class="hebrew-date">{data.shabbat.hebrewDate}</div>
			<div class="english-date">{data.shabbat.englishDate}</div>
			<div class="time-item">
				<span class="time-label">Mincha:</span>
				<span class="time-value" contenteditable="true">{data.shabbat.mincha}</span>
			</div>
			<div class="mincha-reading">
				<span class="reading-label">Torah Reading:</span>
				<span class="reading-value">פרשת {data.shabbat.minchaParsha}</span>
			</div>
			{#if data.shabbat.minchaNotices && (data.shabbat.minchaNotices.additions.length > 0 || data.shabbat.minchaNotices.omissions.length > 0)}
				{#if data.shabbat.minchaNotices.additions.length > 0}
					<div class="liturgical-notice additions">
						{#each data.shabbat.minchaNotices.additions as notice}
							<div>{notice}</div>
						{/each}
					</div>
				{/if}
				{#if data.shabbat.minchaNotices.omissions.length > 0}
					<div class="liturgical-notice omissions">
						{#each data.shabbat.minchaNotices.omissions as notice}
							<div>No {notice}</div>
						{/each}
					</div>
				{/if}
			{/if}
			{#if !data.shabbat.shouldSayTzidkatcha}
				<div class="tzidkatcha-notice">
					No צדקתך ({data.shabbat.tzidkatchaReason})
				</div>
			{/if}
			{#if data.elMalehRachamimInfo && !data.elMalehRachamimInfo.shouldSay}
				<div class="tzidkatcha-notice">
					No א-ל מלא רחמים ({data.elMalehRachamimInfo.reason || 'Special day'})
				</div>
			{/if}
			<div class="time-item">
				<span class="time-label">Maariv:</span>
				<span class="time-value" contenteditable="true">{data.maariv}</span>
			</div>
			{#if data.shabbat.maarivNotices && (data.shabbat.maarivNotices.additions.length > 0 || data.shabbat.maarivNotices.omissions.length > 0)}
				{#if data.shabbat.maarivNotices.additions.length > 0}
					<div class="liturgical-notice additions">
						{#each data.shabbat.maarivNotices.additions as notice}
							<div>{notice}</div>
						{/each}
					</div>
				{/if}
				{#if data.shabbat.maarivNotices.omissions.length > 0}
					<div class="liturgical-notice omissions">
						{#each data.shabbat.maarivNotices.omissions as notice}
							<div>No {notice}</div>
						{/each}
					</div>
				{/if}
			{/if}
			<div class="bottom-section">
				<div class="shkia-section">
					<div class="shkia-title">Shkia</div>
					<div>{data.shabbat.shkia?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || 'N/A'}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Kiddush Levana Notice -->
	{#if data.kiddushLevanaInfo && data.kiddushLevanaInfo.canSayTonight}
		<div class="kiddush-levana-notice" class:last-chance={data.kiddushLevanaInfo.lastChance} class:last-motzei-shabbos={data.kiddushLevanaInfo.lastMotzeiShabbos}>
			<div class="kiddush-levana-title">
				{#if data.kiddushLevanaInfo.lastChance}
					⚠️ Kiddush Levana - Last Chance! ⚠️
				{:else if data.kiddushLevanaInfo.lastMotzeiShabbos}
					🌙 Kiddush Levana - Last Motzei Shabbos 🌙
				{:else if data.kiddushLevanaInfo.isIdealTime}
					🌙 Kiddush Levana - Ideal Time (7 days after molad) 🌙
				{:else}
					🌙 Kiddush Levana 🌙
				{/if}
			</div>
			<div class="kiddush-levana-details">
				{#if data.kiddushLevanaInfo.reason}
					{data.kiddushLevanaInfo.reason}
				{/if}
				{#if data.kiddushLevanaInfo.lastTimeToSay}
					Last time to say: {data.kiddushLevanaInfo.lastTimeToSay.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
				{/if}
			</div>
		</div>
	{/if}

	<!-- General Announcements Section -->
	{#if data.generalAnnouncements && data.generalAnnouncements.length > 0}
		<div class="announcements-section">
			<h3 class="announcements-title">Announcements</h3>
			{#each data.generalAnnouncements as announcement}
				<div class="announcement-item">{announcement}</div>
			{/each}
		</div>
	{/if}
</div>
