<script>
  export let visible = true
  export let className = ''
  export let dataTestId = 'test-element'
  export let customAttr = ''
</script>

{#if visible}
  <div
    class={className}
    data-testid={dataTestId}
    data-custom={customAttr}
  >
    <button type="button" data-testid="focus-button">Click me</button>
    <input type="text" data-testid="focus-input" />
  </div>
{/if}
