import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className={`relative bg-white rounded-2xl w-full ${maxWidth} shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-serif text-xl font-medium text-charcoal">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-charcoal transition-colors rounded-lg hover:bg-gray-50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
