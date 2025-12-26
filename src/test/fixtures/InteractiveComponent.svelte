<script>
  export let show = true
</script>

{#if show}
  <div data-testid="container" class="visible-container">
    <button data-testid="action-button" type="button">Action</button>
  </div>
{/if}
