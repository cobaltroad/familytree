<script>
  import TwoColumnLayout from './TwoColumnLayout.svelte'
</script>

<TwoColumnLayout>
  <div slot="left" class="test-left-content">
    <p>Left column content</p>
  </div>
  <div slot="right" class="test-right-content">
    <p>Right column content</p>
  </div>
</TwoColumnLayout>
