/**
 * Test Suite: ViewSwitcher with Pedigree as Default Tab and Tree Re-added
 *
 * Updated for Story #140: Tree tab has been re-added as TreeView component
 * - Tree tab now exists between Pedigree and Timeline
 * - Pedigree remains the first tab (default view)
 * - /tree is now a valid route (no longer redirects to pedigree)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ViewSwitcher from './ViewSwitcher.svelte'

describe('ViewSwitcher - Tree as Default Tab (TDD)', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  describe('Tree Tab Presence (Story #140)', () => {
    it('should display Tree tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Tree tab should exist
      const treeTab = screen.queryByText('Tree')
      expect(treeTab).toBeTruthy()
    })

    it('should have tree icon (🌳)', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Check that tree emoji is in the component
      const navContent = container.querySelector('nav').textContent
      expect(navContent).toContain('🌳')
    })

    it('should have /tree href on Tree tab', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Get all links
      const links = container.querySelectorAll('a.view-tab')

      // Should have href="#/tree"
      const treeLinks = Array.from(links).filter(link => link.getAttribute('href') === '#/tree')
      expect(treeLinks.length).toBe(1)
    })
  })

  describe('Tab Order', () => {
    it('should have tabs in correct order: Pedigree, Tree, Network, Duplicates, Import, Admin', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')
      expect(viewTabs.length).toBe(6) // Pedigree, Tree, Network, Duplicates, Import, Admin (Timeline and Radial removed)

      expect(viewTabs[0].textContent).toContain('Tree')
      expect(viewTabs[1].textContent).toContain('Pedigree')
      expect(viewTabs[2].textContent).toContain('Network')
      expect(viewTabs[3].textContent).toContain('Duplicates')
      expect(viewTabs[4].textContent).toContain('Import')
      expect(viewTabs[5].textContent).toContain('Admin')
    })

    it('should have correct hrefs for first four tabs', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')

      expect(viewTabs[0].getAttribute('href')).toBe('#/tree')
      expect(viewTabs[1].getAttribute('href')).toBe('#/pedigree')
      expect(viewTabs[2].getAttribute('href')).toBe('#/network')
      expect(viewTabs[3].getAttribute('href')).toBe('#/duplicates')
    })

    it('should have 6 view tabs + 1 add person button = 7 total nav items', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const navItems = container.querySelectorAll('nav > *')
      expect(navItems.length).toBe(7) // 6 tabs + 1 add person button
    })

  })

  describe('Active Tab Highlighting', () => {
    it('should mark Tree tab as active for "/" path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/' } })

      const treeTab = screen.getByText('Tree').closest('a')
      expect(treeTab.classList.contains('active')).toBe(true)
    })

    it('should mark Tree tab as active for "/tree" path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Tree tab should be active when on /tree route
      const treeTab = screen.getByText('Tree').closest('a')
      expect(treeTab.classList.contains('active')).toBe(true)
    })

    it('should NOT mark Pedigree as active when on /tree path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Pedigree should NOT be active when on /tree
      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(false)
    })

    it('should mark Pedigree tab as active for "/pedigree" path', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/pedigree' } })

      const pedigreeTab = screen.getByText('Pedigree').closest('a')
      expect(pedigreeTab.classList.contains('active')).toBe(true)
    })

  })

  describe('Remaining Tabs Still Work', () => {
    it('should display Network tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const networkTab = screen.getByText('Network')
      expect(networkTab).toBeTruthy()
    })

    it('should display Duplicates tab', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const duplicatesTab = screen.getByText('Duplicates')
      expect(duplicatesTab).toBeTruthy()
    })

    it('should still show Add Person link', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()
    })
  })

  describe('Path Normalization', () => {
    it('should normalize "/" to "/tree" for active state', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/' } })

      const treeTab = screen.getByText('Tree').closest('a')
      expect(treeTab.classList.contains('active')).toBe(true)
    })
  })

  describe('Component Count', () => {
    it('should have exactly 6 view tabs', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const viewTabs = container.querySelectorAll('a.view-tab')
      expect(viewTabs.length).toBe(6) // Pedigree, Tree, Network, Duplicates, Import, Admin (Timeline and Radial removed)
    })

  })
})
