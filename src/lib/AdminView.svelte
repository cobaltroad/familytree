<script>
  import { people, relationships } from '../stores/familyStore.js'
  import { peopleById } from '../stores/derivedStores.js'

  // Reactive statements to get data
  $: peopleList = $people || []
  $: relationshipsList = $relationships || []

  // Helper function to get person name by ID
  function getPersonName(personId) {
    const person = $peopleById.get(personId)
    if (!person) return 'Unknown'
    return `${person.firstName} ${person.lastName}`
  }

  // Helper function to format person for display
  function formatPersonWithId(personId) {
    const person = $peopleById.get(personId)
    if (!person) return `${personId} (Unknown)`
    return `${personId} (${person.firstName} ${person.lastName})`
  }

  // Sort people by ID
  $: sortedPeople = [...peopleList].sort((a, b) => a.id - b.id)

  // Sort relationships by ID
  $: sortedRelationships = [...relationshipsList].sort((a, b) => a.id - b.id)
</script>

<div class="admin-container">
  <h2>Admin View - Database Records</h2>
  <p class="subtitle">Development tool for viewing all records and verifying data isolation</p>

  <!-- People Table -->
  <section class="table-section">
    <div class="section-header">
      <h3>People Records</h3>
      <span class="record-count">{peopleList.length} records</span>
    </div>

    {#if peopleList.length === 0}
      <div class="empty-state">
        <p>No people records found in the database.</p>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Birth Date</th>
              <th>Death Date</th>
              <th>Gender</th>
              <th>Photo URL</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedPeople as person (person.id)}
              <tr>
                <td>{person.id}</td>
                <td>{person.firstName} {person.lastName}</td>
                <td>{person.birthDate || '—'}</td>
                <td>{person.deathDate || '—'}</td>
                <td>{person.gender || '—'}</td>
                <td class="truncate">{person.photoUrl || '—'}</td>
                <td class="user-id">{person.userId}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Relationships Table -->
  <section class="table-section">
    <div class="section-header">
      <h3>Relationship Records</h3>
      <span class="record-count">{relationshipsList.length} records</span>
    </div>

    {#if relationshipsList.length === 0}
      <div class="empty-state">
        <p>No relationship records found in the database.</p>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Person 1</th>
              <th>Person 2</th>
              <th>Type</th>
              <th>Parent Role</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedRelationships as rel (rel.id)}
              <tr>
                <td>{rel.id}</td>
                <td>{formatPersonWithId(rel.person1Id)}</td>
                <td>{formatPersonWithId(rel.person2Id)}</td>
                <td>{rel.type}</td>
                <td>{rel.parentRole || '—'}</td>
                <td class="user-id">{rel.userId}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .admin-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.75rem;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: #666;
    font-size: 0.95rem;
    font-style: italic;
  }

  .table-section {
    margin-bottom: 3rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #4CAF50;
  }

  h3 {
    margin: 0;
    color: #333;
    font-size: 1.35rem;
  }

  .record-count {
    background: #4CAF50;
    color: white;
    padding: 0.35rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .table-container {
    overflow-x: auto;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead {
    background: #f5f5f5;
    position: sticky;
    top: 0;
  }

  th {
    text-align: left;
    padding: 0.85rem 1rem;
    font-weight: 600;
    color: #555;
    border-bottom: 2px solid #e0e0e0;
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
  }

  tbody tr:hover {
    background: #fafafa;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .truncate {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-id {
    font-weight: 600;
    color: #4CAF50;
    background: #f9fff9;
  }

  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    color: #999;
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  .empty-state p {
    margin: 0;
    font-size: 1rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .admin-container {
      padding: 1rem;
    }

    h2 {
      font-size: 1.35rem;
    }

    h3 {
      font-size: 1.15rem;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    table {
      font-size: 0.85rem;
    }

    th, td {
      padding: 0.6rem 0.75rem;
    }

    .truncate {
      max-width: 150px;
    }
  }

  @media (max-width: 480px) {
    table {
      font-size: 0.75rem;
    }

    th, td {
      padding: 0.5rem 0.5rem;
    }

    .truncate {
      max-width: 100px;
    }
  }
</style>
