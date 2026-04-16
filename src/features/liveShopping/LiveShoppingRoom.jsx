import { SessionBagProvider, useSessionBag } from './context/SessionBagContext';
import VideoStageLayout from './components/VideoStageLayout';
import SessionBagSidebar from './components/SessionBagSidebar';

const LiveShoppingRoomContent = ({
  role,
  products,
  videoPane,
  checkoutMode,
  createCheckoutSession,
  reduxDispatch,
  addToCartAction,
  sidebarOverride,
  sidebarLabel,
}) => {
  const {
    sidebarOpen,
    toggleSidebar,
    items,
    notifications,
    subtotal,
    unreadNotifications,
    addToSession,
    setItemQuantity,
    removeFromSession,
    buyNow,
  } = useSessionBag();

  const handleBuyNow = async (item, mode) => {
    await buyNow({
      item,
      mode,
      createCheckoutSession,
      dispatchRedux: reduxDispatch,
      addToCartAction,
    });
  };

  const resolvedSidebar = sidebarOverride ?? (
    <SessionBagSidebar
      role={role}
      products={products}
      items={items}
      notifications={notifications}
      subtotal={subtotal}
      unreadNotifications={unreadNotifications}
      onAddToSession={addToSession}
      onSetQty={setItemQuantity}
      onRemoveItem={removeFromSession}
      onBuyNow={handleBuyNow}
      checkoutMode={checkoutMode}
    />
  );

  return (
    <VideoStageLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
      videoPane={videoPane}
      sidebarPane={resolvedSidebar}
      sidebarLabel={sidebarLabel ?? (sidebarOverride ? 'AI Stylist' : 'Session Bag')}
    />
  );
};

const LiveShoppingRoom = ({
  role,
  products,
  videoPane,
  checkoutMode = 'stripe',
  createCheckoutSession,
  reduxDispatch,
  addToCartAction,
  realtimeAdapter,
  sidebarOverride,
  sidebarLabel,
}) => {
  return (
    <SessionBagProvider realtimeAdapter={realtimeAdapter}>
      <LiveShoppingRoomContent
        role={role}
        products={products}
        videoPane={videoPane}
        checkoutMode={checkoutMode}
        createCheckoutSession={createCheckoutSession}
        reduxDispatch={reduxDispatch}
        addToCartAction={addToCartAction}
        sidebarOverride={sidebarOverride}
        sidebarLabel={sidebarLabel}
      />
    </SessionBagProvider>
  );
};

export default LiveShoppingRoom;
