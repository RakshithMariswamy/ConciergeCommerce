import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

const SessionBagContext = createContext(null);

const initialState = {
  sidebarOpen: true,
  items: [],
  notifications: [],
};

const makeNotice = (message) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  message,
  read: false,
  createdAt: new Date().toISOString(),
});

const sessionBagReducer = (state, action) => {
  switch (action.type) {
    case 'SESSION_BAG/ADD_ITEM': {
      const incoming = action.payload;
      const existingIndex = state.items.findIndex(
        (item) => item.productId === incoming.productId && item.variantKey === incoming.variantKey
      );

      let nextItems;
      if (existingIndex >= 0) {
        nextItems = state.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + (incoming.quantity || 1) }
            : item
        );
      } else {
        nextItems = [
          ...state.items,
          {
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            productId: incoming.productId,
            sku: incoming.sku,
            name: incoming.name,
            imageUrl: incoming.imageUrl || null,
            price: incoming.price,
            quantity: incoming.quantity || 1,
            color: incoming.color || null,
            size: incoming.size || null,
            variantKey: incoming.variantKey || 'default',
          },
        ];
      }

      return {
        ...state,
        items: nextItems,
        notifications: [
          makeNotice(`${incoming.name} added to Session Bag`),
          ...state.notifications,
        ],
      };
    }

    case 'SESSION_BAG/REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.itemId),
      };

    case 'SESSION_BAG/SET_QTY':
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.id === action.payload.itemId
              ? { ...item, quantity: action.payload.quantity }
              : item
          )
          .filter((item) => item.quantity > 0),
      };

    case 'SESSION_BAG/MARK_NOTICE_READ':
      return {
        ...state,
        notifications: state.notifications.map((note) =>
          note.id === action.payload.noticeId ? { ...note, read: true } : note
        ),
      };

    case 'SESSION_BAG/CLEAR_NOTICES':
      return { ...state, notifications: [] };

    case 'SESSION_BAG/OPEN_SIDEBAR':
      return { ...state, sidebarOpen: true };

    case 'SESSION_BAG/CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false };

    case 'SESSION_BAG/TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'SESSION_BAG/CLEAR_BAG':
      return { ...state, items: [] };

    default:
      return state;
  }
};

const shouldSync = (type) =>
  [
    'SESSION_BAG/ADD_ITEM',
    'SESSION_BAG/REMOVE_ITEM',
    'SESSION_BAG/SET_QTY',
    'SESSION_BAG/CLEAR_BAG',
    'SESSION_BAG/CLEAR_NOTICES',
    'SESSION_BAG/MARK_NOTICE_READ',
  ].includes(type);

export const SessionBagProvider = ({ children, realtimeAdapter = null }) => {
  const [state, rawDispatch] = useReducer(sessionBagReducer, initialState);

  const dispatch = useCallback(
    (action, options = {}) => {
      const sync = options.sync ?? true;
      rawDispatch(action);

      if (sync && shouldSync(action.type) && realtimeAdapter?.send) {
        realtimeAdapter.send({
          type: 'SESSION_BAG/ACTION',
          payload: action,
        });
      }
    },
    [realtimeAdapter]
  );

  useEffect(() => {
    if (!realtimeAdapter?.subscribe) return undefined;

    const unsubscribe = realtimeAdapter.subscribe((message) => {
      if (!message || message.type !== 'SESSION_BAG/ACTION' || !message.payload) return;
      dispatch(message.payload, { sync: false });
    });

    return unsubscribe;
  }, [dispatch, realtimeAdapter]);

  const subtotal = useMemo(
    () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.items]
  );

  const unreadNotifications = useMemo(
    () => state.notifications.filter((note) => !note.read).length,
    [state.notifications]
  );

  const api = useMemo(
    () => ({
      state,
      items: state.items,
      notifications: state.notifications,
      sidebarOpen: state.sidebarOpen,
      subtotal,
      unreadNotifications,

      addToSession: (product) => dispatch({ type: 'SESSION_BAG/ADD_ITEM', payload: product }),
      removeFromSession: (itemId) =>
        dispatch({ type: 'SESSION_BAG/REMOVE_ITEM', payload: { itemId } }),
      setItemQuantity: (itemId, quantity) =>
        dispatch({ type: 'SESSION_BAG/SET_QTY', payload: { itemId, quantity } }),

      markNotificationRead: (noticeId) =>
        dispatch({ type: 'SESSION_BAG/MARK_NOTICE_READ', payload: { noticeId } }),
      clearNotifications: () => dispatch({ type: 'SESSION_BAG/CLEAR_NOTICES' }),

      openSidebar: () => dispatch({ type: 'SESSION_BAG/OPEN_SIDEBAR' }, { sync: false }),
      closeSidebar: () => dispatch({ type: 'SESSION_BAG/CLOSE_SIDEBAR' }, { sync: false }),
      toggleSidebar: () => dispatch({ type: 'SESSION_BAG/TOGGLE_SIDEBAR' }, { sync: false }),
      clearBag: () => dispatch({ type: 'SESSION_BAG/CLEAR_BAG' }),

      buyNow: async ({ item, mode = 'stripe', createCheckoutSession, dispatchRedux, addToCartAction }) => {
        if (mode === 'stripe') {
          if (!createCheckoutSession) {
            throw new Error('Missing createCheckoutSession callback for Stripe checkout.');
          }

          const checkout = await createCheckoutSession({
            items: [item],
          });

          if (checkout?.url) {
            window.location.assign(checkout.url);
            return;
          }

          return checkout;
        }

        if (mode === 'redux') {
          if (!dispatchRedux || !addToCartAction) {
            throw new Error('Missing Redux dispatch/addToCartAction for redux mode.');
          }
          dispatchRedux(addToCartAction(item));
        }
      },
    }),
    [dispatch, state, subtotal, unreadNotifications]
  );

  return <SessionBagContext.Provider value={api}>{children}</SessionBagContext.Provider>;
};

export const useSessionBag = () => {
  const context = useContext(SessionBagContext);
  if (!context) {
    throw new Error('useSessionBag must be used inside SessionBagProvider');
  }
  return context;
};
