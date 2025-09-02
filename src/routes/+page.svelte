
<script lang="ts">
	export let data;
</script>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap');
	
	:global(body) {
		font-family: 'Frank Ruhl Libre', serif;
		margin: 0;
		padding: 20px;
		background: white;
		color: black;
	}
	
	.announcement-sheet {
		max-width: 8.5in;
		margin: 0 auto;
		padding: 40px;
		border: 2px solid #333;
		background: white;
	}
	
	.header {
		text-align: center;
		margin-bottom: 30px;
		border-bottom: 3px double #333;
		padding-bottom: 20px;
	}
	
	.title {
		font-size: 36px;
		font-weight: 700;
		margin: 0;
		letter-spacing: 1px;
	}
	
	.subtitle {
		font-size: 24px;
		margin: 10px 0 0 0;
		color: #666;
	}
	
	.parsha-section {
		text-align: center;
		margin: 25px 0;
		padding: 15px;
		background: #f9f9f9;
		border: 1px solid #ddd;
	}
	
	.parsha-title {
		font-size: 28px;
		font-weight: 700;
		margin: 0;
		direction: rtl;
	}
	
	.times-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		margin: 30px 0;
		align-items: stretch;
	}
	
	.day-section {
		border: 1px solid #ccc;
		padding: 20px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
	}
	
	.day-title {
		font-size: 26px;
		font-weight: 700;
		margin: 0 0 15px 0;
		text-align: center;
		border-bottom: 1px solid #ccc;
		padding-bottom: 10px;
	}
	
	.time-item {
		display: flex;
		justify-content: space-between;
		margin: 10px 0;
		font-size: 20px;
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
	
	.rosh-chodesh-notice-main {
		background: #e8f5e8;
		color: #2e7d32;
		border: 2px solid #4caf50;
		padding: 15px;
		border-radius: 6px;
		margin: 20px 0;
		text-align: center;
		font-weight: 700;
		font-size: 26px;
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
		background: #e3f2fd;
		border: 1px solid #2196f3;
		padding: 8px;
		margin: 8px 0;
		font-size: 18px;
		color: #1565c0;
		border-radius: 4px;
	}
	
	.liturgical-title {
		font-weight: 600;
		margin-bottom: 4px;
	}
	
	.tzidkatcha-notice {
		background: #fff3e0;
		border: 1px solid #ff9800;
		padding: 8px;
		margin: 8px 0;
		font-size: 18px;
		color: #f57c00;
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
		.week-navigation {
			display: none;
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
	<div class="week-navigation">
		<a href="?week={data.weekOffset - 1}" class="nav-button">← Previous Week</a>
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
		<a href="?week={data.weekOffset + 1}" class="nav-button">Next Week →</a>
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

	<div class="times-grid">
		<div class="day-section">
			<h3 class="day-title">Friday</h3>
			<div class="hebrew-date">{data.friday.hebrewDate}</div>
			<div class="english-date">{data.friday.englishDate}</div>
			<div class="time-item">
				<span class="time-label">Mincha:</span>
				<span class="time-value">{data.friday.mincha}</span>
			</div>
			{#if data.friday.minchaNotices && data.friday.minchaNotices.length > 0}
				<div class="liturgical-notice">
					<div class="liturgical-title">Mincha:</div>
					{#each data.friday.minchaNotices as notice}
						<div>{notice}</div>
					{/each}
				</div>
			{/if}
			<div class="bottom-section">
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
			{#if data.shabbat.minchaNotices && data.shabbat.minchaNotices.length > 0}
				<div class="liturgical-notice">
					<div class="liturgical-title">Mincha:</div>
					{#each data.shabbat.minchaNotices as notice}
						<div>{notice}</div>
					{/each}
				</div>
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
			{#if data.shabbat.maarivNotices && data.shabbat.maarivNotices.length > 0}
				<div class="liturgical-notice">
					<div class="liturgical-title">Maariv:</div>
					{#each data.shabbat.maarivNotices as notice}
						<div>{notice}</div>
					{/each}
				</div>
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
