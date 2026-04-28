const VideoStageLayout = ({ sidebarOpen, onToggleSidebar, videoPane, sidebarPane, sidebarLabel = 'Session Bag' }) => {
  return (
    <div className="h-screen bg-slate-50 text-slate-900">
      <div
        className={`mx-auto grid h-full max-w-[1600px] grid-rows-[minmax(0,1fr)_auto] transition-all duration-300 lg:grid-rows-1 ${
          sidebarOpen ? 'lg:grid-cols-[minmax(0,1fr)_28rem]' : 'lg:grid-cols-[minmax(0,1fr)_4rem]'
        }`}
      >
        {/* ── Video section ── */}
        <section className="relative min-h-0 border-b border-gray-200 lg:border-b-0 lg:border-r lg:border-gray-200">
          <div className="h-full w-full p-3 sm:p-4">
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-100 shadow-luxury border border-gray-200">
              <div className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-contain">
                {videoPane}
              </div>
            </div>
          </div>
        </section>

        {/* ── Sidebar ── */}
        <aside
          className={`min-h-0 overflow-hidden border-gray-200 bg-white transition-all duration-300 shadow-luxury lg:border-l ${
            sidebarOpen ? 'h-[42vh] lg:h-auto' : 'h-16 lg:h-auto'
          }`}
        >
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <p className="text-sm font-semibold text-slate-900 font-sans tracking-wide">{sidebarLabel}</p>
            </div>
            <button
              onClick={onToggleSidebar}
              className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              {sidebarOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {sidebarOpen && (
            <div className="h-[calc(100%-4rem)] overflow-auto p-4">
              {sidebarPane}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default VideoStageLayout;
