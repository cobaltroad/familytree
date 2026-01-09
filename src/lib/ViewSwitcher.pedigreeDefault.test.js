/**
 * TDD Test Suite: ViewSwitcher with Pedigree as Default Tab
 *
 * RED PHASE: These tests will fail initially because:
 * - ViewSwitcher still shows Tree tab
 * - Pedigree is not the first tab
 * - Tree tab is still in the views array
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ViewSwitcher from './ViewSwitcher.svelte'

describe('ViewSwitcher - Pedigree as Default Tab (TDD)', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  describe('Tree Tab Removal', () => {
    it('should NOT display Tree tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      // Tree tab should not exist
      const treeTab = screen.queryByText('Tree')
      expect(treeTab).toBeFalsy()
    })

    it('should NOT have tree icon (🌳)', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      // Check that tree emoji is not in the component
      const navContent = container.querySelector('nav').textContent
      expect(navContent).not.toContain('🌳')
    })

    it('should NOT have /tree in any href', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      // Get all links
      const links = container.querySelectorAll('a.view-tab')

      // None should have href="#/tree"
      const treeLinks = Array.from(links).filter(link => link.getAttribute('href') === '#/tree')
      expect(treeLinks.length).toBe(0)
    })
  })

  describe('Pedigree as First Tab', () => {
    it('should display Pedigree as the first tab', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')
      expect(viewTabs.length).toBeGreaterThan(0)

      // First tab should be Pedigree
      const firstTab = viewTabs[0]
      expect(firstTab.textContent).toContain('Pedigree')
    })

    it('should have pedigree icon (📊) as first icon', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const icons = container.querySelectorAll('a.view-tab .icon')
      expect(icons.length).toBeGreaterThan(0)

      // First icon should be pedigree emoji
      const firstIcon = icons[0]
      expect(firstIcon.textContent).toBe('📊')
    })
  })

  describe('Tab Order', () => {
    it('should have tabs in correct order: Pedigree, Timeline, Radial', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')
      expect(viewTabs.length).toBe(6) // Pedigree, Timeline, Radial, Network, Import, Admin

      expect(viewTabs[0].textContent).toContain('Pedigree')
      expect(viewTabs[1].textContent).toContain('Timeline')
      expect(viewTabs[2].textContent).toContain('Radial')
    })

    it('should have correct hrefs for remaining tabs', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')

      expect(viewTabs[0].getAttribute('href')).toBe('#/pedigree')
      expect(viewTabs[1].getAttribute('href')).toBe('#/timeline')
      expect(viewTabs[2].getAttribute('href')).toBe('#/radial')
    })
  })

  describe('Active Tab Highlighting', () => {
    it('should mark Pedigree tab as active for "/" path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/' } })

      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })

    it('should mark Pedigree tab as active for "/pedigree" path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })

    it('should mark Pedigree tab as active for "/tree" path (redirected)', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // When on /tree (which redirects to pedigree), pedigree should be active
      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })

    it('should NOT mark any tab as active for /tree path if tree is removed', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Tree tab should not exist
      const treeTab = screen.queryByText('Tree')
      expect(treeTab).toBeFalsy()

      // Pedigree should be active instead (due to redirect)
      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })
  })

  describe('Remaining Tabs Still Work', () => {
    it('should display Timeline tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const timelineTab = screen.getByText('Timeline')
      expect(timelineTab).toBeTruthy()
    })

    it('should display Radial tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const radialTab = screen.getByText('Radial')
      expect(radialTab).toBeTruthy()
    })

    it('should still show Add Person link', () => {
      render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()
    })
  })

  describe('Path Normalization', () => {
    it('should normalize "/" to "/pedigree" for active state', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/' } })

      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })

    it('should normalize "/tree" to "/pedigree" for active state', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })
  })

  describe('Component Count', () => {
    it('should have exactly 3 view tabs (not 4)', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')
      expect(viewTabs.length).toBe(6) // Pedigree, Timeline, Radial, Network, Import, Admin
    })

    it('should have 3 view tabs + 1 add person button = 4 total nav items', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const navItems = container.querySelectorAll('nav > *')
      expect(navItems.length).toBe(7) // 6 tabs + 1 add person button
    })
  })
})
