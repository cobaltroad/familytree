<script>
  import Notification from '$lib/components/Notification.svelte'
</script>

<Notification />
<slot />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
