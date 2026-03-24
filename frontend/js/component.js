/**
 * Componentes UI - CAMSEG
 * Sistema de Gestión de Seguridad Electrónica
 */

// ========================================
// TOAST NOTIFICATIONS
// ========================================

const Toast = {
  container: null,
  
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 3000) {
    this.init();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease;
      min-width: 250px;
    `;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ========================================
// MODAL
// ========================================

const Modal = {
  show(modalId) {
    document.getElementById(modalId).classList.add('show');
  },
  
  hide(modalId) {
    document.getElementById(modalId).classList.remove('show');
  },
  
  confirm(options) {
    return new Promise((resolve) => {
      const {
        title = 'Confirmar',
        message = '¿Estás seguro?',
        confirmText = 'Sí',
        cancelText = 'Cancelar',
        confirmClass = 'btn-primary'
      } = options;
      
      // Crear modal si no existe
      let modal = document.getElementById('modal-confirm');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirm';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title" id="confirm-title"></h3>
              <button class="modal-close" onclick="Modal.onCancel()">&times;</button>
            </div>
            <div class="modal-body">
              <p id="confirm-message"></p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
              <button class="btn" id="confirm-ok">Sí</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('confirm-cancel').onclick = () => this.onCancel();
        document.getElementById('confirm-ok').onclick = () => this.onConfirm();
      }
      
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-ok').textContent = confirmText;
      document.getElementById('confirm-ok').className = `btn ${confirmClass}`;
      
      this.resolvePromise = resolve;
      modal.classList.add('show');
    });
  },
  
  onConfirm() {
    document.getElementById('modal-confirm').classList.remove('show');
    if (this.resolvePromise) this.resolvePromise(true);
  },
  
  onCancel() {
    document.getElementById('modal-confirm').classList.remove('show');
    if (this.resolvePromise) this.resolvePromise(false);
  }
};

// ========================================
// LOADING
// ========================================

const Loading = {
  show(message = 'Cargando...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;
      overlay.innerHTML = `
        <div class="spinner" style="width: 50px; height: 50px; border-width: 4px;"></div>
        <p style="margin-top: 20px; color: #64748b;" id="loading-message">Cargando...</p>
      `;
      document.body.appendChild(overlay);
    }
    document.getElementById('loading-message').textContent = message;
    overlay.style.display = 'flex';
  },
  
  hide() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  }
};

// ========================================
// DATETIME HELPERS
// ========================================

const DateTime = {
  format(date, format = 'short') {
    const d = new Date(date);
    
    if (format === 'short') {
      return d.toLocaleDateString('es-ES');
    }
    
    if (format === 'long') {
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    if (format === 'time') {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    if (format === 'datetime') {
      return d.toLocaleString('es-ES');
    }
    
    if (format === 'iso') {
      return d.toISOString().split('T')[0];
    }
    
    return d.toLocaleDateString('es-ES');
  },
  
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },
  
  isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  },
  
  getStartOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },
  
  getEndOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
};

// ========================================
// FORMATTERS
// ========================================

const Formatters = {
  currency(value, decimals = 2) {
    return '$' + parseFloat(value).toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  number(value) {
    return parseFloat(value).toLocaleString('es-ES');
  },
  
  phone(value) {
    if (!value) return '-';
    return value;
  },
  
  truncate(text, length = 50) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },
  
  capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  },
  
  statusBadge(estado) {
    const colors = {
      'programado': 'blue',
      'en_proceso': 'orange',
      'completado': 'green',
      'cancelado': 'red',
      'borrador': 'gray',
      'enviada': 'blue',
      'aprobada': 'green',
      'rechazada': 'red',
      'activo': 'green',
      'inactivo': 'gray'
    };
    
    return `<span class="badge badge-${colors[estado] || 'gray'}">${estado}</span>`;
  },
  
  tipoServicioBadge(tipo) {
    const icons = {
      'instalacion': 'fa-video',
      'mantenimiento': 'fa-wrench',
      'revision': 'fa-magnifying-glass',
      'reparacion': 'fa-screwdriver-wrench'
    };
    
    const colors = {
      'instalacion': 'blue',
      'mantenimiento': 'green',
      'revision': 'orange',
      'reparacion': 'red'
    };
    
    return `<span class="badge badge-${colors[tipo] || 'gray'}">
      <i class="fas ${icons[tipo] || 'fa-cog'}"></i>
      ${this.capitalize(tipo)}
    </span>`;
  }
};

// ========================================
// VALIDATORS
// ========================================

const Validators = {
  required(value, message = 'Este campo es requerido') {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },
  
  email(value, message = 'Email inválido') {
    if (!value) return null;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? null : message;
  },
  
  phone(value, message = 'Teléfono inválido') {
    if (!value) return null;
    const regex = /^[\d\s\-\+\$\$]{7,}$/;
    return regex.test(value) ? null : message;
  },
  
  number(value, message = 'Debe ser un número') {
    if (!value) return null;
    return isNaN(parseFloat(value)) ? message : null;
  },
  
  min(value, min, message = null) {
    if (!value) return null;
    message = message || `Debe ser mayor a ${min}`;
    return parseFloat(value) >= min ? null : message;
  },
  
  max(value, max, message = null) {
    if (!value) return null;
    message = message || `Debe ser menor a ${max}`;
    return parseFloat(value) <= max ? null : message;
  },
  
  minLength(value, min, message = null) {
    if (!value) return null;
    message = message || `Mínimo ${min} caracteres`;
    return value.length >= min ? null : message;
  },
  
  maxLength(value, max, message = null) {
    if (!value) return null;
    message = message || `Máximo ${max} caracteres`;
    return value.length <= max ? null : message;
  },
  
  validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;
    
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      const value = input.value;
      let error = null;
      
      // Check required
      if (!value.trim()) {
        error = 'Este campo es requerido';
      }
      
      if (!error && input.type === 'email') {
        error = this.email(value);
      }
      
      if (!error && input.type === 'number') {
        error = this.number(value);
      }
      
      if (error) {
        isValid = false;
        this.showError(input, error);
      } else {
        this.clearError(input);
      }
    });
    
    return isValid;
  },
  
  showError(input, message) {
    let errorEl = input.parentNode.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      input.parentNode.appendChild(errorEl);
    }
    errorEl.textContent = message;
    input.style.borderColor = '#ef4444';
  },
  
  clearError(input) {
    const errorEl = input.parentNode.querySelector('.form-error');
    if (errorEl) errorEl.remove();
    input.style.borderColor = '';
  }
};

// ========================================
// PAGINATION
// ========================================

const Pagination = {
  render(containerId, options, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = options;
    
    let html = `
      <div class="flex justify-between items-center mt-4">
        <span class="text-muted text-sm">
          Mostrando ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems}
        </span>
        <div class="flex gap-2">
    `;
    
    // Previous button
    html += `
      <button class="btn btn-sm btn-secondary" ${currentPage <= 1 ? 'disabled' : ''} onclick="Pagination.go(${currentPage - 1})">
        Anterior
      </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
      html += `<button class="btn btn-sm btn-secondary" onclick="Pagination.go(1)">1</button>`;
      if (startPage > 2) html += `<span class="p-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="Pagination.go(${i})">
          ${i}
        </button>
      `;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="p-2">...</span>`;
      html += `<button class="btn btn-sm btn-secondary" onclick="Pagination.go(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `
      <button class="btn btn-sm btn-secondary" ${currentPage >= totalPages ? 'disabled' : ''} onclick="Pagination.go(${currentPage + 1})">
        Siguiente
      </button>
    `;
    
    html += `
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Store callback
    this.onPageChange = onPageChange;
  },
  
  go(page) {
    if (this.onPageChange) {
      this.onPageChange(page);
    }
  }
};

// ========================================
// DATA TABLE
// ========================================

const DataTable = {
  render(tableId, options) {
    const {
      columns,
      data,
      emptyMessage = 'No hay datos',
      onRowClick = null,
      onAction = null
    } = options;
    
    const table = document.getElementById(tableId);
    if (!table) return;
    
    if (!data || data.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="${columns.length}">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <h3>${emptyMessage}</h3>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    let html = '<thead><tr>';
    columns.forEach(col => {
      html += `<th>${col.title}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.forEach((row, index) => {
      html += `<tr ${onRowClick ? `onclick="DataTable.onRowClick(${index})"` : ''}>`;
      columns.forEach(col => {
        let value = row[col.field];
        
        // Apply formatter if exists
        if (col.formatter) {
          value = col.formatter(value, row);
        }
        
        html += `<td>${value !== undefined ? value : ''}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody>';
    table.innerHTML = html;
    
    // Store data and callbacks
    this.data = data;
    this.onRowClick = onRowClick;
    this.onAction = onAction;
  },
  
  getRow(index) {
    return this.data ? this.data[index] : null;
  }
};

// ========================================
// EXPORT
// ========================================

window.Toast = Toast;
window.Modal = Modal;
window.Loading = Loading;
window.DateTime = DateTime;
window.Formatters = Formatters;
window.Validators = Validators;
window.Pagination = Pagination;
window.DataTable = DataTable;