// ========================================
// CAMSEG - Gestión de Autenticación
// ========================================

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = window.location.pathname.split('/').pop();
  
  // páginas que no requieren auth
  const publicPages = ['index.html', ''];
  
  if (publicPages.includes(currentPage)) {
    // Ya está logueado? ir a dashboard
    try {
      if (typeof api !== 'undefined' && api.token && api.getUser()) {
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      console.log('API no disponible aún');
    }
    return;
  }
  
  // Verificar token
  try {
    if (typeof api === 'undefined' || !api.token) {
      window.location.href = 'index.html';
      return;
    }
    
    // Verificar validez del token
    const verification = await api.verifyToken();
    if (!verification) {
      window.location.href = 'index.html';
      return;
    }
    
    // Inicializar aplicación
    initApp();
  } catch (error) {
    console.error('Error de autenticación:', error);
    window.location.href = 'index.html';
  }
});

// Inicializar aplicación logueada
function initApp() {
  try {
    const user = api.getUser();
    if (!user) return;
    
    // Actualizar usuario en sidebar
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const userInitials = document.getElementById('user-initials');
    
    if (userName) userName.textContent = user.nombre_completo || user.nombre || 'Usuario';
    if (userRole) userRole.textContent = user.rol === 'admin' ? 'Administrador' : 'Técnico';
    if (userInitials) userInitials.textContent = getInitials(user.nombre_completo || user.nombre || 'Usuario');
    
    // Actualizar fecha
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
      dateElement.textContent = formatDate(new Date(), 'full');
    }
    
    // Configurar navegación activa
    setActiveNav();
    
    // Configurar logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof api !== 'undefined') {
          api.logout();
        }
      });
    }
  } catch (error) {
    console.error('Error inicializando app:', error);
  }
}

// Establecer navegación activa
function setActiveNav() {
  try {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href && href === currentPage) {
        item.classList.add('active');
      } else if (currentPage === '' || currentPage === 'dashboard.html') {
        if (href === 'dashboard.html') {
          item.classList.add('active');
        }
      }
    });
  } catch (error) {
    console.error('Error configurando navegación:', error);
  }
}

// Logout
function logout() {
  try {
    if (typeof api !== 'undefined') {
      api.logout();
    }
  } catch (error) {
    console.error('Error en logout:', error);
    window.location.href = 'index.html';
  }
}

// Obtener iniciales del nombre
function getInitials(name) {
  try {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  } catch (error) {
    return 'U';
  }
}

// Verificar rol
function hasRole(roles) {
  try {
    if (typeof api === 'undefined') return false;
    const user = api.getUser();
    if (!user) return false;
    return roles.includes(user.rol);
  } catch (error) {
    return false;
  }
}

// Format fecha
function formatDate(date, format = 'short') {
  try {
    if (format === 'full') {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return date.toLocaleDateString('es-ES');
  } catch (error) {
    return date.toString();
  }
}