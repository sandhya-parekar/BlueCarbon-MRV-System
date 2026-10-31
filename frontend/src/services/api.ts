import {
  AuthResponse, User, DatasetStats, TreeMeasurement,
  BiomassSummary, UncertaintyAssessment, PrioritizationSummary,
  ComparativeAnalysis, BlockchainStatus, BlockchainRecord,
  DashboardAnalytics
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

class ApiService {
  private getHeaders(contentType: string | null = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = localStorage.getItem('bluecarbon_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMsg = response.statusText || `HTTP Error ${response.status}`;
      }
      throw new Error(errorMsg);
    }
    return response.json();
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse<AuthResponse>(res);
  }

  async register(name: string, email: string, password: string, role: string, organization?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, email, password, role, organization }),
    });
    return this.handleResponse<User>(res);
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<User>(res);
  }

  // --- Environmental Data Management ---
  async getTrees(params?: { plot_id?: string; species?: string; region?: string; skip?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.plot_id) query.append('plot_id', params.plot_id);
    if (params?.species) query.append('species', params.species);
    if (params?.region) query.append('region', params.region);
    if (params?.skip !== undefined) query.append('skip', params.skip.toString());
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE_URL}/data/trees?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ total: number; trees: TreeMeasurement[] }>(res);
  }

  async addTreeMeasurement(tree: Partial<TreeMeasurement>): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/data/trees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(tree),
    });
    return this.handleResponse<any>(res);
  }

  async uploadCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('bluecarbon_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/data/upload-csv`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<any>(res);
  }

  async getDatasetStats(): Promise<DatasetStats> {
    const res = await fetch(`${API_BASE_URL}/data/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<DatasetStats>(res);
  }

  async cleanAndValidateDataset(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/data/clean-and-validate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async resetSampleDataset(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/data/reset-sample`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Biomass Estimation ---
  async getBiomassSummary(): Promise<BiomassSummary> {
    const res = await fetch(`${API_BASE_URL}/biomass/summary`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<BiomassSummary>(res);
  }

  async getBiomassPlots(params?: { region?: string; plot_type?: string; priority?: string; sort_by?: string; ascending?: boolean }) {
    const query = new URLSearchParams();
    if (params?.region) query.append('region', params.region);
    if (params?.plot_type) query.append('plot_type', params.plot_type);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.ascending !== undefined) query.append('ascending', params.ascending.toString());

    const res = await fetch(`${API_BASE_URL}/biomass/plots?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async getSinglePlot(plotId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/biomass/plots/${plotId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Uncertainty Assessment ---
  async getUncertaintySummary(): Promise<UncertaintyAssessment> {
    const res = await fetch(`${API_BASE_URL}/uncertainty/summary`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UncertaintyAssessment>(res);
  }

  async getPlotUncertainty(plotId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/uncertainty/plot/${plotId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Prioritization Engine ---
  async getPrioritizationSummary(): Promise<PrioritizationSummary> {
    const res = await fetch(`${API_BASE_URL}/prioritization/summary`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PrioritizationSummary>(res);
  }

  async recalculatePrioritization(weights: { w_uncertainty: number; w_data_quality: number; w_biomass_impact: number }): Promise<any> {
    const query = new URLSearchParams({
      w_uncertainty: weights.w_uncertainty.toString(),
      w_data_quality: weights.w_data_quality.toString(),
      w_biomass_impact: weights.w_biomass_impact.toString(),
    });

    const res = await fetch(`${API_BASE_URL}/prioritization/recalculate?${query.toString()}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Comparative Analysis ---
  async getComparativeAnalysis(budget: number = 24, simulations: number = 10000): Promise<ComparativeAnalysis> {
    const query = new URLSearchParams({
      budget: budget.toString(),
      simulations: simulations.toString(),
    });

    const res = await fetch(`${API_BASE_URL}/comparative/analysis?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ComparativeAnalysis>(res);
  }

  // --- Blockchain Registry ---
  async getBlockchainStatus(): Promise<BlockchainStatus> {
    const res = await fetch(`${API_BASE_URL}/blockchain/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<BlockchainStatus>(res);
  }

  async getBlockchainRecords(): Promise<BlockchainRecord[]> {
    const res = await fetch(`${API_BASE_URL}/blockchain/records`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<BlockchainRecord[]>(res);
  }

  async getPlotBlockchainHistory(plotId: string): Promise<BlockchainRecord[]> {
    const res = await fetch(`${API_BASE_URL}/blockchain/history/${plotId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<BlockchainRecord[]>(res);
  }

  async registerPlotOnChain(plotId: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/blockchain/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ plot_id: plotId, notes }),
    });
    return this.handleResponse<any>(res);
  }

  // --- Verification Management ---
  async getVerificationTasks(params?: { status_filter?: string; priority_filter?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.status_filter) query.append('status_filter', params.status_filter);
    if (params?.priority_filter) query.append('priority_filter', params.priority_filter);

    const res = await fetch(`${API_BASE_URL}/verification/tasks?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async submitVerificationDecision(plotId: string, status: string, comments: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/verification/decision`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ plot_id: plotId, status, comments }),
    });
    return this.handleResponse<any>(res);
  }

  // --- Analytics & Reports ---
  async getAnalyticsDashboard(): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<DashboardAnalytics>(res);
  }

  async downloadCsvReport(): Promise<void> {
    const token = localStorage.getItem('bluecarbon_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/reports/csv`, { headers });
    if (!res.ok) throw new Error('Failed to download CSV');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlueCarbon_MRV_Prioritization_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  async downloadPdfReport(): Promise<void> {
    const token = localStorage.getItem('bluecarbon_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/reports/pdf`, { headers });
    if (!res.ok) throw new Error('Failed to download PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlueCarbon_MRV_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}

export const api = new ApiService();
