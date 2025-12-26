<script>
  import RelationshipCardGrid from './RelationshipCardGrid.svelte'

  export let people = []
</script>

<RelationshipCardGrid title="Test Grid">
  <div class="test-card-content">
    {#each people as person (person.id)}
      <div class="test-card">{person.firstName} {person.lastName}</div>
    {/each}
  </div>
</RelationshipCardGrid>
