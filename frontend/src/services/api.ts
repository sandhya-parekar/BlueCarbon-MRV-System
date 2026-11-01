import {
  AuthResponse, User, DatasetStats, TreeMeasurement,
  BiomassSummary, UncertaintyAssessment, PrioritizationSummary,
  ComparativeAnalysis, BlockchainStatus, BlockchainRecord,
  DashboardAnalytics, PlantSpecies, PlantRecommendationResponse,
  GrowthCalculationResult, LandAreaCalculationResult,
  EnvironmentalBenefitsResult, PlantingProject,
  PlantMonitoringRecord, CalendarEvent, UserPlantingImpact,
  CommunityRegisterPayload, SupportTicket, SupportTicketCreatePayload,
  TicketMessage, StaffMember, NotificationItem, CommunityDashboardData,
  CommunicationStats, TicketStatus
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

  // --- Plant Growth & Blue Carbon Planner API ---

  async getSpeciesList(params?: { category?: string; is_mangrove?: boolean; search?: string }): Promise<{ total: number; species: PlantSpecies[] }> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.is_mangrove !== undefined) query.append('is_mangrove', params.is_mangrove.toString());
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE_URL}/planner/species?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ total: number; species: PlantSpecies[] }>(res);
  }

  async getSingleSpecies(speciesId: string): Promise<PlantSpecies> {
    const res = await fetch(`${API_BASE_URL}/planner/species/${speciesId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PlantSpecies>(res);
  }

  async createOrUpdateSpecies(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/planner/species`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(res);
  }

  async getPlantRecommendations(params: {
    country?: string;
    state?: string;
    district?: string;
    location?: string;
    soil_type?: string;
    land_type?: string;
    water_condition?: string;
    planting_purpose?: string;
    land_area?: number;
    number_of_plants?: number;
  }): Promise<PlantRecommendationResponse> {
    const res = await fetch(`${API_BASE_URL}/planner/recommend`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return this.handleResponse<PlantRecommendationResponse>(res);
  }

  async calculateGrowth(params: {
    species_id: string;
    planting_date: string;
    number_of_plants?: number;
    initial_height_cm?: number;
    soil_condition?: string;
    sunlight_exposure?: string;
    water_availability?: string;
    care_level?: string;
  }): Promise<GrowthCalculationResult> {
    const res = await fetch(`${API_BASE_URL}/planner/calculate-growth`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return this.handleResponse<GrowthCalculationResult>(res);
  }

  async calculateLandArea(params: {
    species_id: string;
    number_of_plants: number;
    available_land_area: number;
    area_unit?: string;
    custom_spacing_m?: number;
    pathway_buffer_pct?: number;
  }): Promise<LandAreaCalculationResult> {
    const res = await fetch(`${API_BASE_URL}/planner/calculate-land`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return this.handleResponse<LandAreaCalculationResult>(res);
  }

  async calculateEnvironmentalBenefits(params: {
    species_id: string;
    number_of_plants: number;
    land_area_ha: number;
    stand_age_years?: number;
    survival_rate_pct?: number;
  }): Promise<EnvironmentalBenefitsResult> {
    const res = await fetch(`${API_BASE_URL}/planner/calculate-benefits`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return this.handleResponse<EnvironmentalBenefitsResult>(res);
  }

  async getPlantingCalendar(speciesId?: string, region?: string): Promise<{ events: CalendarEvent[] }> {
    const query = new URLSearchParams();
    if (speciesId) query.append('species_id', speciesId);
    if (region) query.append('region', region);

    const res = await fetch(`${API_BASE_URL}/planner/calendar?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ events: CalendarEvent[] }>(res);
  }

  async getPlantingProjects(userId?: string): Promise<{ total: number; projects: PlantingProject[] }> {
    const query = new URLSearchParams();
    if (userId) query.append('user_id', userId);

    const res = await fetch(`${API_BASE_URL}/planner/projects?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ total: number; projects: PlantingProject[] }>(res);
  }

  async getProjectDetails(projectId: string): Promise<PlantingProject> {
    const res = await fetch(`${API_BASE_URL}/planner/projects/${projectId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PlantingProject>(res);
  }

  async createPlantingProject(project: Partial<PlantingProject>): Promise<{ message: string; project: PlantingProject }> {
    const res = await fetch(`${API_BASE_URL}/planner/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
    return this.handleResponse<{ message: string; project: PlantingProject }>(res);
  }

  async updatePlantingProject(projectId: string, project: Partial<PlantingProject>): Promise<{ message: string; project: PlantingProject }> {
    const res = await fetch(`${API_BASE_URL}/planner/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
    return this.handleResponse<{ message: string; project: PlantingProject }>(res);
  }

  async deletePlantingProject(projectId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/planner/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(res);
  }

  async getMonitoringRecords(projectId?: string): Promise<{ total: number; records: PlantMonitoringRecord[] }> {
    const query = new URLSearchParams();
    if (projectId) query.append('project_id', projectId);

    const res = await fetch(`${API_BASE_URL}/planner/monitoring?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ total: number; records: PlantMonitoringRecord[] }>(res);
  }

  async createMonitoringRecord(record: Partial<PlantMonitoringRecord>): Promise<{ message: string; record: PlantMonitoringRecord }> {
    const res = await fetch(`${API_BASE_URL}/planner/monitoring`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(record),
    });
    return this.handleResponse<{ message: string; record: PlantMonitoringRecord }>(res);
  }

  async deleteMonitoringRecord(recordId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/planner/monitoring/${recordId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(res);
  }

  async getUserPlantingImpact(): Promise<UserPlantingImpact> {
    const res = await fetch(`${API_BASE_URL}/planner/user-impact`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UserPlantingImpact>(res);
  }

  // ==============================================================================
  // COMMUNITY & COMMUNICATION SYSTEM
  // ==============================================================================

  async registerCommunity(payload: CommunityRegisterPayload): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register-community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<User>(res);
  }

  async getCommunityDashboard(): Promise<CommunityDashboardData> {
    const res = await fetch(`${API_BASE_URL}/community/dashboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<CommunityDashboardData>(res);
  }

  async getSupportTickets(params?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<{ total: number; tickets: SupportTicket[] }> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE_URL}/communication/tickets?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ total: number; tickets: SupportTicket[] }>(res);
  }

  async getSupportTicketDetails(ticketId: string): Promise<SupportTicket> {
    const res = await fetch(`${API_BASE_URL}/communication/tickets/${ticketId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SupportTicket>(res);
  }

  async createSupportTicket(payload: SupportTicketCreatePayload): Promise<SupportTicket> {
    const res = await fetch(`${API_BASE_URL}/communication/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<SupportTicket>(res);
  }

  async replySupportTicket(
    ticketId: string,
    message: string,
    attachment_url?: string
  ): Promise<TicketMessage> {
    const res = await fetch(`${API_BASE_URL}/communication/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, attachment_url }),
    });
    return this.handleResponse<TicketMessage>(res);
  }

  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    resolution_note?: string
  ): Promise<SupportTicket> {
    const res = await fetch(`${API_BASE_URL}/communication/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, resolution_note }),
    });
    return this.handleResponse<SupportTicket>(res);
  }

  async assignSupportTicket(
    ticketId: string,
    assignedToId: string,
    priority?: string
  ): Promise<SupportTicket> {
    const res = await fetch(`${API_BASE_URL}/communication/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ assigned_to_id: assignedToId, priority }),
    });
    return this.handleResponse<SupportTicket>(res);
  }

  async getStaffMembers(): Promise<StaffMember[]> {
    const res = await fetch(`${API_BASE_URL}/communication/staff`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<StaffMember[]>(res);
  }

  async getNotifications(
    unreadOnly: boolean = false
  ): Promise<{ unread_count: number; total: number; notifications: NotificationItem[] }> {
    const query = new URLSearchParams();
    if (unreadOnly) query.append('unread_only', 'true');

    const res = await fetch(`${API_BASE_URL}/communication/notifications?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ unread_count: number; total: number; notifications: NotificationItem[] }>(res);
  }

  async markNotificationRead(notificationId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/communication/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(res);
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/communication/notifications/read-all`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(res);
  }

  async getCommunicationStats(): Promise<CommunicationStats> {
    const res = await fetch(`${API_BASE_URL}/communication/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<CommunicationStats>(res);
  }
}

export const api = new ApiService();
