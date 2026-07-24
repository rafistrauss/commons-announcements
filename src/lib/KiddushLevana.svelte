<script lang="ts">
  export let kiddushLevanaInfo: {
    canSayTonight: boolean;
    reason?: string;
    isIdealTime?: boolean;
    lastChance?: boolean;
    lastMotzeiShabbos?: boolean;
    lastTimeToSay?: Date;
  } | null;
</script>

{#if kiddushLevanaInfo && kiddushLevanaInfo.canSayTonight}
  <div class="kiddush-levana-notice" class:last-chance={kiddushLevanaInfo.lastChance} class:last-motzei-shabbos={kiddushLevanaInfo.lastMotzeiShabbos}>
    <div class="kiddush-levana-title">
      {#if kiddushLevanaInfo.lastChance}
        ⚠️ Kiddush Levana - Last Chance! ⚠️
      {:else if kiddushLevanaInfo.lastMotzeiShabbos}
        🌙 Kiddush Levana - Last Motzei Shabbos 🌙
      {:else if kiddushLevanaInfo.isIdealTime}
        🌙 Kiddush Levana - Ideal Time (7 days after molad) 🌙
      {:else}
        🌙 Kiddush Levana 🌙
      {/if}
    </div>
    <div class="kiddush-levana-details">
      {#if kiddushLevanaInfo.reason}
        {kiddushLevanaInfo.reason}
      {/if}
      {#if kiddushLevanaInfo.lastTimeToSay}
        Last time to say: {kiddushLevanaInfo.lastTimeToSay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })}
      {/if}
    </div>
  </div>
{/if}

<style>
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
</style>