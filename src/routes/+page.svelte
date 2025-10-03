<script lang="ts">
  import { resolve } from '$app/paths';

	export let data;

	function weekHref(offset: number) {
		if (offset === 0) return resolve('/');
		return `?week=${offset}`;
	}
	function jumpToToday() {
		window.location.href = '/';
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
</style>

<div class="announcement-sheet">
	<div class="jump-to-today" style="display: flex; justify-content: center; margin-bottom: 10px;">
		<a href={resolve('/')} class="nav-button">Jump to Today</a>
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
				<span class="time-value">{data.friday.mincha}</span>
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
				<span class="time-value">{data.shabbat.mincha}</span>
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
			<div class="time-item">
				<span class="time-label">Maariv:</span>
				<span class="time-value">{data.maariv}</span>
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
