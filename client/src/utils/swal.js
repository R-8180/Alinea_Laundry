import Swal from 'sweetalert2';

// Format WA helper locally if needed in swal
const formatWA = (num) => {
  if (!num) return '';
  let cleaned = num.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

// Premium Swal configurations that match the Alinea Laundry design language
const commonConfig = {
  background: '#ffffff',
  color: '#1e1b4b', // Navy
  confirmButtonColor: '#4f46e5', // Indigo
  cancelButtonColor: '#64748b', // Slate
  customClass: {
    popup: 'swal-premium-popup',
    title: 'swal-premium-title',
    htmlContainer: 'swal-premium-text',
    confirmButton: 'swal-premium-btn',
    cancelButton: 'swal-premium-btn-cancel'
  },
  heightAuto: false
};

export const showAlert = (title, text = '', icon = 'info') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    icon,
    confirmButtonText: 'OK'
  });
};

export const showSuccess = (title, text = '') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#10b981', // Green for success
    confirmButtonText: 'Selesai'
  });
};

export const showError = (title, text = '') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#ef4444', // Red for error
    confirmButtonText: 'Tutup'
  });
};

export const showWarning = (title, text = '') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    icon: 'warning',
    confirmButtonColor: '#f59e0b', // Amber for warning
    confirmButtonText: 'OK'
  });
};

export const showConfirm = (title, text = '', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#ef4444',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText
  });
};

export const showLoading = (title = 'Mohon Tunggu...', text = 'Sedang memproses data') => {
  return Swal.fire({
    ...commonConfig,
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

export const closeLoading = () => {
  Swal.close();
};

// Also export raw Swal for custom cases
export { Swal, formatWA };
