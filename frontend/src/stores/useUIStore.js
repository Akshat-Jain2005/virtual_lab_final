import { create } from 'zustand'

const useUIStore = create((set) => ({
  // Sidebar visibility
  propertiesPanelOpen: true,
  collabSidebarOpen:   true,
  analyticsOpen:       false,
  libraryOpen:         false,

  // Modals
  activeModal: null,   // 'settings' | 'fork' | 'save' | 'invite' | null

  // Theme (always dark for this app)
  theme: 'dark',

  // Actions
  togglePropertiesPanel: () => set(s => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  toggleCollabSidebar:   () => set(s => ({ collabSidebarOpen:   !s.collabSidebarOpen })),
  toggleAnalytics:       () => set(s => ({ analyticsOpen:       !s.analyticsOpen })),
  openModal:  (modal) => set({ activeModal: modal }),
  closeModal: ()      => set({ activeModal: null }),
}))

export default useUIStore
