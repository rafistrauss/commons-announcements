<script lang="ts">
import { JewishCalendar } from 'kosher-zmanim';
import { getShabbatInfo } from '$lib/shabbat-info';

// Example data structure for aliyot and leiners
let aliyot = [
  { aliyah: 'כהן', leiner: 'Doni Goldstein' },
  { aliyah: 'לוי', leiner: 'Doni Goldstein' },
  { aliyah: 'שלישי', leiner: 'Rafi Strauss' },
  { aliyah: 'רביעי', leiner: 'Rafe' },
  { aliyah: 'חמישי', leiner: 'Ariel Schabes' },
  { aliyah: 'שישי', leiner: 'Daniel Blau' },
  { aliyah: 'שביעי', leiner: 'Rafi Lefkowitz' },
  { aliyah: 'הפטרה', leiner: 'Rafi Lefkowitz' },
];


// Calculate special Shacharis info for today
function getShacharisNotices(date: Date): string[] {
  const jewishCal = new JewishCalendar(date);
  const notices: string[] = [];

  // Yekum Purkan (said on Shabbat, not on Yom Tov or Chol Hamoed)
  if (date.getDay() === 6 && !jewishCal.isYomTov() && !jewishCal.isCholHamoed()) {
    // notices.push('Yekum Purkan is recited.');
  }

  // Avinu Malkeinu (not said on Shabbat, Yom Tov, or during Nisan/Tishrei)
  if (
    date.getDay() !== 6 &&
    !jewishCal.isYomTov() &&
    jewishCal.getJewishMonth() !== 1 && // Not Nisan
    jewishCal.getJewishMonth() !== 7 // Not Tishrei
  ) {
    // notices.push('Avinu Malkeinu is recited.');
  } else if (date.getDay() === 6 || jewishCal.isYomTov()) {
    // notices.push('Avinu Malkeinu is omitted.');
  }

  // Yaaleh Veyavo (Rosh Chodesh, Yom Tov, Chol Hamoed)
  if (jewishCal.isRoshChodesh() || jewishCal.isYomTov() || jewishCal.isCholHamoed()) {
    // notices.push('Yaaleh Veyavo is recited.');
  }

  // Al Hanisim (Chanukah, Purim)
  if (jewishCal.isChanukah()) {
    // notices.push('Al Hanisim is recited (Chanukah).');
  }
  // Purim: 14 Adar (regular), 15 Adar (Shushan Purim)
  const m = jewishCal.getJewishMonth();
  const d = jewishCal.getJewishDayOfMonth();
  if ((m === 12 || m === 14) && d === 14) {
    notices.push('Al Hanisim is recited (Purim).');
  }
  if ((m === 12 || m === 14) && d === 15) {
    notices.push('Al Hanisim is recited (Shushan Purim).');
  }

  // Tachanun (not said on Shabbat, Yom Tov, Rosh Chodesh, Nisan, etc.)
  if (
    date.getDay() === 6 ||
    jewishCal.isYomTov() ||
    jewishCal.isRoshChodesh() ||
    jewishCal.getJewishMonth() === 1 // Nisan
  ) {
    // notices.push('Tachanun is omitted.');
  }

  return notices;
}

let today = new Date();
let shabbatInfo = getShabbatInfo(today);
let specialInfo = getShacharisNotices(shabbatInfo.shabbat);
</script>


<style>
    @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap');

.announcement-sheet {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  max-width: 600px;
  margin: 32px auto;
  padding: 32px 24px;
  font-family: 'Frank Ruhl Libre', serif;
}
.header {
  text-align: center;
  margin-bottom: 16px;
}
.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25em;
}
.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 1em;
}
.section-box {
  background: #f7f7fa;
  border-radius: 8px;
  padding: 18px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5em;
}
.special-list {
  margin: 0;
  padding-left: 1.2em;
}
.leining-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5em;
}
.leining-table th, .leining-table td {
  border: 1px solid #e0e0e0;
  padding: 6px 10px;
  text-align: left;
}
.leining-table td:first-child, .leining-table th:first-child {
  font-family: 'Noto Sans Hebrew', 'Frank Ruhl Libre', 'David Libre', 'Arial', sans-serif;
  font-size: 1.1em;
  direction: rtl;
}
.hebrew-font {
  font-family: 'Noto Sans Hebrew', 'Frank Ruhl Libre', 'David Libre', 'Arial', sans-serif;
  direction: rtl;
}
.leining-table th {
  background: #f0f0f5;
  font-weight: 600;
}
 .leining-table th {
  background: #f0f0f5;
  font-weight: 600;
}
</style>

<div class="announcement-sheet">

  <header class="header">
    <h1 class="title">Shabbat Shacharis</h1>
    <div class="subtitle">Commons Minyan</div>
    <div style="margin-top: 0.5em; font-size: 1.1em;">
      <strong>Parsha:</strong> {shabbatInfo.parsha}
    </div>
    <div style="font-size: 1.05em; margin-top: 0.2em;">
      <strong>Date:</strong> {shabbatInfo.englishDate} / {shabbatInfo.hebrewDate}
    </div>
  </header>

  <!-- <div class="section-box">
    <div class="section-title">Special Prayers / Announcements</div>
    <ul class="special-list">
      {#each specialInfo as info}
        <li>{info}</li>
      {/each}
    </ul>
  </div> -->

  <div class="section-box">
    <div class="section-title">Leining Assignments</div>
    <table class="leining-table">
      <thead>
        <tr>
          <th>Aliyah</th>
          <th>Leiner</th>
        </tr>
      </thead>
      <tbody>
        {#each aliyot as { aliyah, leiner }}
          <tr>
            <td>{aliyah}</td>
            <td>{leiner}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
