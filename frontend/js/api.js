// ========================================
// CAMSEG - API Client
// ========================================

const API_URL = 'http://localhost:3000/api';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('camseg_token');
  }

  // Headers por defecto
  get headers() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Métodos HTTP
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ========== AUTH ==========
  async login(usuario, password) {
    const data = await this.post('/auth/login', { usuario, password });
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('camseg_token', data.token);
      localStorage.setItem('camseg_user', JSON.stringify(data.user));
    }
    return data;
  }

  async verifyToken() {
    try {
      return await this.get('/auth/verify');
    } catch {
      this.logout();
      return null;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('camseg_token');
    localStorage.removeItem('camseg_user');
    window.location.href = 'index.html';
  }

  getUser() {
    const user = localStorage.getItem('camseg_user');
    return user ? JSON.parse(user) : null;
  }

  // ========== DASHBOARD ==========
  async getDashboard() {
    return this.get('/dashboard');
  }

  async getAgenda(fecha) {
    return this.get(`/dashboard/agenda?fecha=${fecha}`);
  }

  async getAgendaSemana(fechaInicio) {
    return this.get(`/dashboard/agenda/semana?fecha_inicio=${fechaInicio}`);
  }

  // ========== CLIENTES ==========
  async getClientes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/clientes?${query}`);
  }

  async getCliente(id) {
    return this.get(`/clientes/${id}`);
  }

  async createCliente(data) {
    return this.post('/clientes', data);
  }

  async updateCliente(id, data) {
    return this.put(`/clientes/${id}`, data);
  }

  async deleteCliente(id) {
    return this.delete(`/clientes/${id}`);
  }

  // ========== SERVICIOS ==========
  async getServicios(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/servicios?${query}`);
  }

  async getServicio(id) {
    return this.get(`/servicios/${id}`);
  }

  async getServiciosHoy() {
    return this.get('/servicios/hoy');
  }

  async createServicio(data) {
    return this.post('/servicios', data);
  }

  async updateServicio(id, data) {
    return this.put(`/servicios/${id}`, data);
  }

  async deleteServicio(id) {
    return this.delete(`/servicios/${id}`);
  }

  async addMaterialServicio(servicioId, data) {
    return this.post(`/servicios/${servicioId}/materiales`, data);
  }

  // ========== INVENTARIO ==========
  async getInventario(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/inventario?${query}`);
  }

  async getRepuesto(id) {
    return this.get(`/inventario/${id}`);
  }

  async createRepuesto(data) {
    return this.post('/inventario', data);
  }

  async updateRepuesto(id, data) {
    return this.put(`/inventario/${id}`, data);
  }

  async descontarStock(id, data) {
    return this.post(`/inventario/${id}/descontar`, data);
  }

  async aumentarStock(id, data) {
    return this.post(`/inventario/${id}/aumentar`, data);
  }

  async getInventarioStats() {
    return this.get('/inventario/resumen/stats');
  }

  // ========== COTIZACIONES ==========
  async getCotizaciones(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/cotizaciones?${query}`);
  }

  async getCotizacion(id) {
    return this.get(`/cotizaciones/${id}`);
  }

  async createCotizacion(data) {
    return this.post('/cotizaciones', data);
  }

  async updateCotizacion(id, data) {
    return this.put(`/cotizaciones/${id}`, data);
  }

  async convertirCotizacion(id) {
    return this.post(`/cotizaciones/${id}/convertir`, {});
  }

  async deleteCotizacion(id) {
    return this.delete(`/cotizaciones/${id}`);
  }

  // ========== VENTAS ==========
  async getVentas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/ventas?${query}`);
  }

  async getVentasEstadisticas() {
    return this.get('/ventas/estadisticas');
  }

  async getVenta(id) {
    return this.get(`/ventas/${id}`);
  }

  async createVenta(data) {
    return this.post('/ventas', data);
  }

  async updateVenta(id, data) {
    return this.put(`/ventas/${id}`, data);
  }

  async deleteVenta(id) {
    return this.delete(`/ventas/${id}`);
  }
}

// Instancia global
const api = new APIClient();
