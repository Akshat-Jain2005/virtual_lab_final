import { create } from 'zustand'

const useUIStore = create((set) => ({
  
  propertiesPanelOpen: true,
  collabSidebarOpen:   true,
  analyticsOpen:       false,
  libraryOpen:         false,

  
  activeModal: null,   

  
  theme: 'dark',

  
  togglePropertiesPanel: () => set(s => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  toggleCollabSidebar:   () => set(s => ({ collabSidebarOpen:   !s.collabSidebarOpen })),
  toggleAnalytics:       () => set(s => ({ analyticsOpen:       !s.analyticsOpen })),
  openModal:  (modal) => set({ activeModal: modal }),
  closeModal: ()      => set({ activeModal: null }),
}))

export default useUIStore
