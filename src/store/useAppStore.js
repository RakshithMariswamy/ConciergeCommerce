import { create } from 'zustand';
import { mockCustomers, mockProducts, mockInventory, initialTasks } from '../data/mockData';

const VALID_ASSOCIATE_TABS = new Set(['tasks', 'assign', 'clients', 'cart']);

const useAppStore = create((set, get) => ({
  // ─── TASKS ───────────────────────────────────────────────────────────────────
  tasks: initialTasks,

  /**
   * Associate accepts a task — transitions Pending or Assigned → Active.
   */
  acceptTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId && (t.status === 'Pending' || t.status === 'Assigned')
          ? { ...t, status: 'Active', acceptedAt: new Date().toISOString() }
          : t
      ),
    })),

  completeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'Completed', completedAt: new Date().toISOString() }
          : t
      ),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [
        {
          assigneeId: null,
          assignedAt: null,
          autoReassignCount: 0,
          customerTier: null,
          ...task,
          receivedAt: new Date().toISOString(),
        },
        ...state.tasks,
      ],
    })),

  /**
   * Auto-assigns or manually assigns a task to an associate.
   * Transitions: Pending → Assigned
   * Also fires a real-time notification so the associate sees it immediately.
   */
  assignTaskToAssociate: (taskId, associateId, associateName = '') =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      const updatedTasks = state.tasks.map((t) =>
        t.id === taskId && t.status === 'Pending'
          ? { ...t, status: 'Assigned', assigneeId: associateId, assignedAt: new Date().toISOString() }
          : t
      );
      if (!task) return { tasks: updatedTasks };

      const notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'task_assigned',
        message: associateName ? `Task assigned to ${associateName}` : 'New task assigned',
        detail: `${task.type} · ${task.customer} · ${task.item?.slice(0, 45)}`,
        taskId,
        assigneeId: associateId,
        timestamp: new Date().toISOString(),
      };
      return { tasks: updatedTasks, notifications: [notification, ...state.notifications] };
    }),

  /**
   * Returns a task to the Pending pool (auto-reassignment or manual revocation).
   * Increments autoReassignCount for observability.
   */
  unassignTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId && (t.status === 'Assigned' || t.status === 'Active')
          ? {
              ...t,
              status: 'Pending',
              assigneeId: null,
              assignedAt: null,
              autoReassignCount: (t.autoReassignCount ?? 0) + 1,
            }
          : t
      ),
    })),

  /**
   * Reassigns a task to a different associate.
   * Also fires a notification so the new assignee is alerted.
   */
  reassignTask: (taskId, newAssociateId, associateName = '') =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      const updatedTasks = state.tasks.map((t) =>
        t.id === taskId &&
        (t.status === 'Assigned' || t.status === 'Active' || t.status === 'Pending')
          ? { ...t, status: 'Assigned', assigneeId: newAssociateId, assignedAt: new Date().toISOString() }
          : t
      );
      if (!task) return { tasks: updatedTasks };

      const notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'task_assigned',
        message: associateName ? `Task reassigned to ${associateName}` : 'Task reassigned',
        detail: `${task.type} · ${task.customer}`,
        taskId,
        assigneeId: newAssociateId,
        timestamp: new Date().toISOString(),
      };
      return { tasks: updatedTasks, notifications: [notification, ...state.notifications] };
    }),

  /**
   * Flags a task for attention / escalation.
   */
  flagTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'Flagged', flaggedAt: new Date().toISOString() }
          : t
      ),
    })),

  /**
   * Returns a Flagged task to Pending.
   */
  unflagTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId && t.status === 'Flagged'
          ? {
              ...t,
              status: 'Pending',
              flaggedAt: null,
              assigneeId: null,
              assignedAt: null,
            }
          : t
      ),
    })),

  // ─── CUSTOMERS ───────────────────────────────────────────────────────────────
  customers: mockCustomers,
  selectedCustomerId: null,

  selectCustomer: (id) => set({ selectedCustomerId: id }),

  // ─── PRODUCTS & INVENTORY ────────────────────────────────────────────────────
  products: mockProducts,
  inventory: mockInventory,

  // ─── CART ────────────────────────────────────────────────────────────────────
  cart: {
    customerId: null,
    items: [],
  },

  setCartCustomer: (customerId) =>
    set((state) => ({ cart: { ...state.cart, customerId } })),

  addToCart: (product, size, color, qty = 1) =>
    set((state) => {
      const existingIdx = state.cart.items.findIndex(
        (i) => i.productId === product.id && i.size === size && i.color === color
      );
      if (existingIdx >= 0) {
        const items = [...state.cart.items];
        items[existingIdx] = { ...items[existingIdx], qty: items[existingIdx].qty + qty };
        return { cart: { ...state.cart, items } };
      }
      return {
        cart: {
          ...state.cart,
          items: [
            ...state.cart.items,
            {
              id: Date.now(),
              productId: product.id,
              name: product.name,
              price: product.price,
              sku: product.sku,
              category: product.category,
              size,
              color,
              qty,
            },
          ],
        },
      };
    }),

  removeFromCart: (itemId) =>
    set((state) => ({
      cart: { ...state.cart, items: state.cart.items.filter((i) => i.id !== itemId) },
    })),

  updateCartQty: (itemId, qty) =>
    set((state) => ({
      cart: {
        ...state.cart,
        items:
          qty > 0
            ? state.cart.items.map((i) => (i.id === itemId ? { ...i, qty } : i))
            : state.cart.items.filter((i) => i.id !== itemId),
      },
    })),

  clearCart: () => set({ cart: { customerId: null, items: [] } }),

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: Date.now(), timestamp: new Date().toISOString() },
        ...state.notifications,
      ],
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  // ─── PAYMENT LINK ────────────────────────────────────────────────────────────
  paymentLink: null,

  generatePaymentLink: () => {
    const { cart } = get();
    const total = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const token = Math.random().toString(36).slice(2, 11).toUpperCase();
    const link = {
      url: `https://pay.macys-concierge.store/${token}`,
      token,
      total,
      itemCount: cart.items.reduce((sum, i) => sum + i.qty, 0),
      createdAt: new Date().toISOString(),
    };
    set({ paymentLink: link });
    return link;
  },

  clearPaymentLink: () => set({ paymentLink: null }),

  // ─── UI STATE ────────────────────────────────────────────────────────────────
  activeTab: 'tasks',
  setActiveTab: (tab) =>
    set((state) => (VALID_ASSOCIATE_TABS.has(tab) ? { activeTab: tab } : state)),
}));

export default useAppStore;
