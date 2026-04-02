import React from 'react';
import PropTypes from 'prop-types';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

function SuccessModal({ isOpen, onClose, userEmail }) {
  const dialogRef = useAccessibleOverlay({ isOpen, onClose });
  const titleId = 'success-modal-title';
  const descriptionId = 'success-modal-description';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6"
      >
        <h2 id={titleId} className="text-xl font-bold text-brand-navy dark:text-white mb-4">
          Inquiry Successfully Initialized
        </h2>
        <p id={descriptionId} className="text-sm text-gray-700 dark:text-gray-300 mb-6">
          Your request for institutional access has been securely logged. A PEPTQ coordinator will review your credentials and research intent. Expect a verification email at <strong>{userEmail}</strong> within 1 business day.
        </p>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          className="w-full bg-brand-orange text-white font-bold py-2 rounded hover:bg-brand-orange-dark transition"
        >
          Return to Research Portal
        </button>
      </div>
    </div>
  );
}

SuccessModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired,
};

export default SuccessModal;
