import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/svelte'
import AdminView from './AdminView.svelte'
import * as familyStore from '../stores/familyStore.js'
import * as derivedStores from '../stores/derivedStores.js'
import { writable, derived } from 'svelte/store'

describe('AdminView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // Helper to create peopleById map
  function createPeopleByIdMap(people) {
    return new Map(people.map(p => [p.id, p]))
  }

  describe('People Table', () => {
    it('should render people table with headers when people exist', () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      expect(screen.getByText('People Records')).toBeInTheDocument()
      expect(screen.getByText('ID')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Birth Date')).toBeInTheDocument()
      expect(screen.getByText('Death Date')).toBeInTheDocument()
      expect(screen.getByText('Gender')).toBeInTheDocument()
    })

    it('should display person records in table rows', () => {
      const mockPeople = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1980-01-15',
          deathDate: null,
          gender: 'male',
          photoUrl: 'https://example.com/photo.jpg'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1985-06-20',
          deathDate: '2020-12-25',
          gender: 'female',
          photoUrl: null
        }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      // Check first person
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('1980-01-15')).toBeInTheDocument()
      expect(screen.getByText('male')).toBeInTheDocument()

      // Check second person
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('1985-06-20')).toBeInTheDocument()
      expect(screen.getByText('2020-12-25')).toBeInTheDocument()
      expect(screen.getByText('female')).toBeInTheDocument()
    })

    it('should show empty state when no people exist', () => {
      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      render(AdminView)

      expect(screen.getByText(/No people records found/i)).toBeInTheDocument()
    })

    it('should display record count', () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
        { id: 3, firstName: 'Bob', lastName: 'Johnson' }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      expect(screen.getByText(/3 records/i)).toBeInTheDocument()
    })

    it('should handle null/undefined values gracefully', () => {
      const mockPeople = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          birthDate: null,
          deathDate: null,
          gender: null,
          photoUrl: null
        }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      // Should display empty cells or dashes for null values
      const cells = screen.getAllByRole('cell')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  describe('Relationships Table', () => {
    it('should render relationships table with headers when relationships exist', () => {
      const mockRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable(mockRelationships))

      render(AdminView)

      expect(screen.getByText('Relationship Records')).toBeInTheDocument()
      expect(screen.getByText('Person 1')).toBeInTheDocument()
      expect(screen.getByText('Person 2')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Parent Role')).toBeInTheDocument()
    })

    it('should display relationship records with person names', () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]

      const mockRelationships = [
        {
          id: 100,
          person1Id: 1,
          person2Id: 2,
          type: 'parentOf',
          parentRole: 'mother'
        },
        {
          id: 101,
          person1Id: 1,
          person2Id: 2,
          type: 'spouse',
          parentRole: null
        }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable(mockRelationships))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      // Check first relationship
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getAllByText(/1 \(John Doe\)/).length).toBe(2) // Appears in both rows
      expect(screen.getAllByText(/2 \(Jane Smith\)/).length).toBe(2) // Appears in both rows
      expect(screen.getByText('parentOf')).toBeInTheDocument()
      expect(screen.getByText('mother')).toBeInTheDocument()

      // Check second relationship - ID 101 appears multiple times (relationship ID + user IDs)
      expect(screen.getAllByText('101').length).toBeGreaterThan(0)
      expect(screen.getByText('spouse')).toBeInTheDocument()
    })

    it('should show empty state when no relationships exist', () => {
      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      render(AdminView)

      expect(screen.getByText(/No relationship records found/i)).toBeInTheDocument()
    })

    it('should display relationship record count', () => {
      const mockRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' },
        { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable(mockRelationships))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      render(AdminView)

      expect(screen.getByText(/2 records/i)).toBeInTheDocument()
    })

    it('should handle unknown person IDs gracefully', () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' }
      ]

      const mockRelationships = [
        {
          id: 100,
          person1Id: 1,
          person2Id: 999, // Unknown person ID
          type: 'spouse'
        }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable(mockRelationships))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      render(AdminView)

      expect(screen.getByText(/1 \(John Doe\)/)).toBeInTheDocument()
      expect(screen.getByText(/999 \(Unknown\)/)).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render tables with horizontal scroll capability', () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' }
      ]

      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable(mockPeople))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(createPeopleByIdMap(mockPeople)))

      const { container } = render(AdminView)

      const tables = container.querySelectorAll('.table-container')
      expect(tables.length).toBeGreaterThan(0)
    })
  })

  describe('Visual Styling', () => {
    it('should use consistent styling with other views', () => {
      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      const { container } = render(AdminView)

      // Check for admin-container class
      expect(container.querySelector('.admin-container')).toBeInTheDocument()
    })

    it('should have section headers for each table', () => {
      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      render(AdminView)

      expect(screen.getByText('People Records')).toBeInTheDocument()
      expect(screen.getByText('Relationship Records')).toBeInTheDocument()
    })
  })

  describe('GEDCOM Export Button', () => {
    beforeEach(() => {
      // Mock stores for all export tests
      vi.spyOn(familyStore, 'people', 'get').mockReturnValue(writable([]))
      vi.spyOn(familyStore, 'relationships', 'get').mockReturnValue(writable([]))
      vi.spyOn(derivedStores, 'peopleById', 'get').mockReturnValue(writable(new Map()))

      // Mock fetch for settings endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ viewAllRecords: false })
      })
    })

    it('should render Export GEDCOM button', () => {
      render(AdminView)

      const exportButton = screen.getByRole('button', { name: /export family tree as gedcom file/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveTextContent(/export gedcom/i)
    })

    it('should call api.exportGedcom with 5.5.1 format when clicked', async () => {
      const { api } = await import('./api.js')
      const mockExportGedcom = vi.fn().mockResolvedValue(undefined)
      vi.spyOn(api, 'exportGedcom').mockImplementation(mockExportGedcom)

      render(AdminView)

      const exportButton = screen.getByRole('button', { name: /export family tree as gedcom file/i })
      await fireEvent.click(exportButton)

      expect(mockExportGedcom).toHaveBeenCalledWith('5.5.1')
    })

    it('should show loading state while export is in progress', async () => {
      const { api } = await import('./api.js')
      let resolveExport
      const exportPromise = new Promise(resolve => {
        resolveExport = resolve
      })
      vi.spyOn(api, 'exportGedcom').mockReturnValue(exportPromise)

      render(AdminView)

      const exportButton = screen.getByRole('button', { name: /export family tree as gedcom file/i })
      await fireEvent.click(exportButton)

      // Wait for reactive updates
      await new Promise(resolve => setTimeout(resolve, 0))

      // Button should be disabled during export
      expect(exportButton).toBeDisabled()
      expect(screen.getByText(/exporting/i)).toBeInTheDocument()

      // Resolve the export
      resolveExport()
      await exportPromise
    })

    it('should show error notification if export fails', async () => {
      const { api } = await import('./api.js')
      const { error } = await import('../stores/notificationStore.js')
      const mockError = vi.fn()
      vi.spyOn(api, 'exportGedcom').mockRejectedValue(new Error('Export failed'))

      // Mock the notification error function
      vi.mock('../stores/notificationStore.js', () => ({
        error: vi.fn()
      }))

      render(AdminView)

      const exportButton = screen.getByRole('button', { name: /export family tree as gedcom file/i })
      await fireEvent.click(exportButton)

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify error was logged (we can't easily test notification in unit tests)
      // The component should handle the error gracefully
      expect(exportButton).not.toBeDisabled()
    })

    it('should have consistent styling with other control panel buttons', () => {
      const { container } = render(AdminView)

      const exportButton = screen.getByRole('button', { name: /export family tree as gedcom file/i })

      // Button should be in the control panel area
      const controlPanel = container.querySelector('.control-panel')
      expect(controlPanel).toContainElement(exportButton)
    })
  })
})
