<script lang="ts">
  import { onMount } from 'svelte';

  export let data;

  let html2canvas: any = null;

  onMount(async () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => {
      html2canvas = (window as any).html2canvas;
    };
    document.head.appendChild(script);
  });

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
      const originalCursor = document.body.style.cursor;
      document.body.style.cursor = 'wait';

      const controls = document.querySelectorAll('.jump-to-today');
      const originalDisplayStyles: string[] = [];
      controls.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        originalDisplayStyles[index] = htmlEl.style.display;
        htmlEl.style.display = 'none';
      });

      const originalPadding = element.style.padding;
      const originalBorder = element.style.border;
      const originalMaxWidth = element.style.maxWidth;
      const originalWidth = element.style.width;
      const originalBoxSizing = element.style.boxSizing;

      element.style.padding = '20px';
      element.style.border = 'none';
      element.style.maxWidth = 'none';
      element.style.width = '816px';
      element.style.boxSizing = 'border-box';

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 816,
        windowHeight: element.scrollHeight
      });

      element.style.padding = originalPadding;
      element.style.border = originalBorder;
      element.style.maxWidth = originalMaxWidth;
      element.style.width = originalWidth;
      element.style.boxSizing = originalBoxSizing;
      controls.forEach((el, index) => {
        (el as HTMLElement).style.display = originalDisplayStyles[index];
      });

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          alert('Failed to create image.');
          document.body.style.cursor = originalCursor;
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pesach-announcements-all-${data.currentDateKey}.jpg`;
        link.href = url;
        link.click();
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
  <title>Commons Minyan Pesach Announcements</title>
</svelte:head>

<div class="announcement-sheet">
  <div class="jump-to-today" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 10px;">
    <button onclick={saveAsImage} class="nav-button save-image">Save as Image</button>
  </div>

  <header class="header">
    <h1 class="title">Pesach {data.currentDateKey.slice(0, 4)}</h1>
    <p class="subtitle">Commons Minyan</p>
  </header>

  <div class="days-grid">
    {#each data.days as day}
      <section class="day-block">
      <div class="parsha-section">
        <h2 class="parsha-title">{day.name}</h2>
        <div class="hebrew-date">{day.hebrewDate}</div>
        <div class="english-date">{day.englishDate}</div>
      </div>

      <div class="times-grid">
        <section class="day-section">

          {#if day.shacharit}
            <div class="time-item">
              <span class="time-label">Shacharit:</span>
              <span class="time-value" contenteditable="true">{day.shacharit}</span>
            </div>
            {#if day.shacharitNotices.additions.length > 0}
              <div class="liturgical-notice additions">
                <div class="liturgical-title">Shacharit Additions:</div>
                {#each day.shacharitNotices.additions as addition}
                  <div>{addition}</div>
                {/each}
              </div>
            {/if}
            {#if day.shacharitNotices.omissions.length > 0}
              <div class="liturgical-notice omissions">
                <div class="liturgical-title">Shacharit Omissions:</div>
                {#each day.shacharitNotices.omissions as omission}
                  <div>{omission}</div>
                {/each}
              </div>
            {/if}
          {/if}

          {#if day.minchaAndMaariv}
            <div class="time-item">
              <span class="time-label">Mincha/Maariv:</span>
              <span class="time-value" contenteditable="true">{day.minchaAndMaariv}</span>
            </div>
            {#if day.omer}
              <div class="sefira-notice">
                <div class="sefira-title">ספירת העומר</div>
                <div class="sefira-nusach" dir="rtl">{day.omer.nusach}</div>
              </div>
            {/if}
            {#if day.maarivNotices.additions.length > 0}
              <div class="liturgical-notice additions">
                <div class="liturgical-title">Maariv Additions:</div>
                {#each day.maarivNotices.additions as addition}
                  <div>{addition}</div>
                {/each}
              </div>
            {/if}
            {#if day.maarivNotices.omissions.length > 0}
              <div class="liturgical-notice omissions">
                <div class="liturgical-title">Maariv Omissions:</div>
                {#each day.maarivNotices.omissions as omission}
                  <div>{omission}</div>
                {/each}
              </div>
            {/if}
          {:else}
            {#if day.mincha}
              <div class="time-item">
                <span class="time-label">Mincha:</span>
                <span class="time-value" contenteditable="true">{day.mincha}</span>
              </div>
              {#if day.minchaNotices.additions.length > 0}
                <div class="liturgical-notice additions">
                  <div class="liturgical-title">Mincha Additions:</div>
                  {#each day.minchaNotices.additions as addition}
                    <div>{addition}</div>
                  {/each}
                </div>
              {/if}
              {#if day.minchaNotices.omissions.length > 0}
                <div class="liturgical-notice omissions">
                  <div class="liturgical-title">Mincha Omissions:</div>
                  {#each day.minchaNotices.omissions as omission}
                    <div>{omission}</div>
                  {/each}
                </div>
              {/if}
            {/if}

            {#if day.maariv}
              <div class="time-item">
                <span class="time-label">Maariv:</span>
                <span class="time-value" contenteditable="true">{day.maariv}</span>
              </div>
              {#if day.omer}
                <div class="sefira-notice">
                  <div class="sefira-title">ספירת העומר</div>
                  <div class="sefira-nusach" dir="rtl">{day.omer.nusach}</div>
                </div>
              {/if}
              {#if day.maarivNotices.additions.length > 0}
                <div class="liturgical-notice additions">
                  <div class="liturgical-title">Maariv Additions:</div>
                  {#each day.maarivNotices.additions as addition}
                    <div>{addition}</div>
                  {/each}
                </div>
              {/if}
              {#if day.maarivNotices.omissions.length > 0}
                <div class="liturgical-notice omissions">
                  <div class="liturgical-title">Maariv Omissions:</div>
                  {#each day.maarivNotices.omissions as omission}
                    <div>{omission}</div>
                  {/each}
                </div>
              {/if}
            {/if}
          {/if}
        </section>
      </div>

      {#if day.announcements.length > 0}
        <div class="announcements-section">
          {#each day.announcements as announcement}
            <div class="announcement-item">{announcement}</div>
          {/each}
        </div>
      {/if}
      </section>
    {/each}
  </div>
</div>

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
    padding: 14px;
    border: 2px solid #333;
    background: white;
  }

  .header {
    text-align: center;
    margin-bottom: 10px;
    border-bottom: 3px double #333;
    padding-bottom: 8px;
  }

  .title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    letter-spacing: 1px;
  }

  .subtitle {
    font-size: 18px;
    margin: 5px 0 0 0;
    color: #666;
  }

  .days-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: start;
  }

  .day-block {
    margin-top: 0;
    padding-top: 0;
    border: 1px dashed #bbb;
    padding: 8px;
    height: stretch;
  }

  .parsha-section {
    text-align: center;
    margin: 8px 0;
    padding: 8px;
    background: #f9f9f9;
    border: 1px solid #ddd;
  }

  .parsha-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    direction: rtl;
  }

  .english-date {
    font-size: 16px;
    color: #888;
    text-align: center;
    margin-bottom: 8px;
  }

  .hebrew-date {
    direction: rtl;
    font-size: 20px;
    color: #666;
    text-align: center;
    margin: 10px 0;
    font-weight: bold;
  }

  .times-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 10px 0;
    align-items: stretch;
  }

  .day-section {
    border: 1px solid #ccc;
    padding: 10px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
  }

  .time-item {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    font-size: 16px;
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

  .liturgical-notice {
    border: 1px solid #b3d9e6;
    padding: 6px;
    margin: 6px 0;
    font-size: 15px;
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
  }

  .liturgical-title {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .sefira-notice {
    background: #f3e5f5;
    border: 1px solid #9c27b0;
    padding: 8px;
    margin: 8px 0;
    border-radius: 4px;
  }

  .sefira-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 4px;
    color: #7b1fa2;
    text-align: center;
    direction: rtl;
  }

  .sefira-nusach {
    font-size: 17px;
    text-align: center;
    display: block;
  }

  .nav-button {
    background: #2196f3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 17px;
    text-decoration: none;
    display: inline-block;
  }

  .nav-button.save-image {
    background: #4caf50;
  }

  .nav-button.save-image:hover {
    background: #388e3c;
  }

  .announcements-section {
    margin-top: 12px;
    padding: 10px;
  }

  .announcement-item {
    font-size: 15px;
    margin-bottom: 6px;
    padding: 7px;
    background: #f5f5f5;
    border-left: 4px solid #d32f2f;
    border-radius: 4px;
  }

  @media print {
    .jump-to-today {
      display: none !important;
    }

    :global(body) {
      padding: 0;
    }

    .announcement-sheet {
      border: none;
      padding: 12px;
      max-width: none;
    }

    .day-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .days-grid {
      grid-template-columns: 1fr 1fr;
    }

    * {
      background: transparent !important;
      border-radius: 0 !important;
    }
  }

  @media screen and (max-width: 768px) {
    .days-grid {
      grid-template-columns: 1fr;
    }
  }

  @media print {
    .days-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
