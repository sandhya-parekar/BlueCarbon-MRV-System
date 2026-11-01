import React, { useState, useEffect } from 'react';
import {
  Sprout, Trees, Calculator, Ruler, Scale,
  FolderHeart, Activity, Calendar, BookOpen, Sparkles,
  Plus, Trash2, Edit3, AlertTriangle, CheckCircle2,
  Info, Droplets, Sun, Wind, MapPin, TrendingUp,
  Leaf, RefreshCw, X, ShieldAlert, Check, ChevronRight,
  Search, Filter, ArrowRight, MessageSquare, HeartHandshake
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  PlantSpecies, PlantRecommendationResponse,
  GrowthCalculationResult, LandAreaCalculationResult,
  EnvironmentalBenefitsResult, PlantingProject,
  PlantMonitoringRecord, CalendarEvent, UserPlantingImpact
} from '../types';

interface PlantPlannerPageProps {
  onNavigate?: (page: string) => void;
}

export const PlantPlannerPage: React.FC<PlantPlannerPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('selection');

  // Shared state
  const [speciesList, setSpeciesList] = useState<PlantSpecies[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('rhizophora_mucronata');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assistance Request Modal state
  const [isAssistanceModalOpen, setIsAssistanceModalOpen] = useState<boolean>(false);
  const [assistLocation, setAssistLocation] = useState<string>('South 24 Parganas, West Bengal');
  const [assistLandArea, setAssistLandArea] = useState<number>(5000);
  const [assistAreaUnit, setAssistAreaUnit] = useState<string>('sq_meters');
  const [assistSpeciesId, setAssistSpeciesId] = useState<string>('rhizophora_mucronata');
  const [assistPlantsCount, setAssistPlantsCount] = useState<number>(1000);
  const [assistSoilType, setAssistSoilType] = useState<string>('Saline Marine Mud/Clay');
  const [assistWaterAvail, setAssistWaterAvail] = useState<string>('Regular Tidal Inundation');
  const [assistPurpose, setAssistPurpose] = useState<string>('Blue Carbon & Coastal Protection');
  const [assistQuestions, setAssistQuestions] = useState<string>('');
  const [submittingAssist, setSubmittingAssist] = useState<boolean>(false);

  const handleRequestAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAssist(true);
    try {
      const selectedSp = speciesList.find(s => s.id === assistSpeciesId);
      const specName = selectedSp ? selectedSp.common_name : assistSpeciesId;
      const created = await api.createSupportTicket({
        subject: `Planting Guidance Request: ${specName} (${assistPlantsCount} plants)`,
        category: 'Planting Assistance',
        description: assistQuestions.trim() || `Requesting scientific recommendations for planting ${assistPlantsCount} ${specName} on ${assistLandArea} ${assistAreaUnit}.`,
        location: assistLocation,
        site_parameters: {
          location: assistLocation,
          available_land_area: assistLandArea,
          area_unit: assistAreaUnit,
          selected_species_id: assistSpeciesId,
          selected_species_name: specName,
          number_of_plants: assistPlantsCount,
          soil_type: assistSoilType,
          water_availability: assistWaterAvail,
          planting_purpose: assistPurpose
        }
      });
      setActionMessage({
        type: 'success',
        text: `Assistance request (${created.ticket_number}) submitted to Scientists! Our researchers will guide you in the Communication Centre.`
      });
      setIsAssistanceModalOpen(false);
      setAssistQuestions('');
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to submit assistance request.'
      });
    } finally {
      setSubmittingAssist(false);
    }
  };

  // Tab 1: Plant Selection
  const [recCountry, setRecCountry] = useState<string>('India');
  const [recState, setRecState] = useState<string>('West Bengal');
  const [recDistrict, setRecDistrict] = useState<string>('South 24 Parganas');
  const [recLocation, setRecLocation] = useState<string>('Coastal');
  const [recSoil, setRecSoil] = useState<string>('Saline Marine Mud/Clay');
  const [recLand, setRecLand] = useState<string>('Intertidal Mudflat');
  const [recWater, setRecWater] = useState<string>('Regular Tidal Inundation');
  const [recPurpose, setRecPurpose] = useState<string>('Blue Carbon & Coastal Protection');
  const [recArea, setRecArea] = useState<number>(5000);
  const [recPlants, setRecPlants] = useState<number>(1000);
  const [recommendationResult, setRecommendationResult] = useState<PlantRecommendationResponse | null>(null);
  const [loadingRec, setLoadingRec] = useState<boolean>(false);
  const [speciesSearch, setSpeciesSearch] = useState<string>('');
  const [speciesCategoryFilter, setSpeciesCategoryFilter] = useState<string>('All');

  // Tab 2: Growth Calculator
  const [growthSpeciesId, setGrowthSpeciesId] = useState<string>('rhizophora_mucronata');
  const [growthPlantingDate, setGrowthPlantingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [growthPlantsCount, setGrowthPlantsCount] = useState<number>(500);
  const [growthInitHeight, setGrowthInitHeight] = useState<number>(35);
  const [growthSoilCond, setGrowthSoilCond] = useState<string>('Good');
  const [growthSunExposure, setGrowthSunExposure] = useState<string>('Full Sun');
  const [growthWaterAvail, setGrowthWaterAvail] = useState<string>('Optimal');
  const [growthCareLevel, setGrowthCareLevel] = useState<string>('Moderate');
  const [growthResult, setGrowthResult] = useState<GrowthCalculationResult | null>(null);
  const [loadingGrowth, setLoadingGrowth] = useState<boolean>(false);

  // Tab 3: Land Area Calculator
  const [landSpeciesId, setLandSpeciesId] = useState<string>('rhizophora_mucronata');
  const [landPlantsCount, setLandPlantsCount] = useState<number>(1000);
  const [landAvailableArea, setLandAvailableArea] = useState<number>(4500);
  const [landAreaUnit, setLandAreaUnit] = useState<string>('sq_meters');
  const [landCustomSpacing, setLandCustomSpacing] = useState<number>(2.0);
  const [landBufferPct, setLandBufferPct] = useState<number>(12);
  const [landResult, setLandResult] = useState<LandAreaCalculationResult | null>(null);
  const [loadingLand, setLoadingLand] = useState<boolean>(false);

  // Tab 4: Environmental Benefits Calculator
  const [benefitsSpeciesId, setBenefitsSpeciesId] = useState<string>('rhizophora_mucronata');
  const [benefitsPlantsCount, setBenefitsPlantsCount] = useState<number>(1200);
  const [benefitsAreaHa, setBenefitsAreaHa] = useState<number>(0.6);
  const [benefitsStandAge, setBenefitsStandAge] = useState<number>(5.0);
  const [benefitsSurvivalRate, setBenefitsSurvivalRate] = useState<number>(88.0);
  const [benefitsResult, setBenefitsResult] = useState<EnvironmentalBenefitsResult | null>(null);
  const [loadingBenefits, setLoadingBenefits] = useState<boolean>(false);

  // Tab 5: My Planting Projects
  const [projects, setProjects] = useState<PlantingProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<PlantingProject | null>(null);
  const [newProjectData, setNewProjectData] = useState({
    project_name: '',
    country: 'India',
    state: 'West Bengal',
    district: 'South 24 Parganas',
    location_name: '',
    species_id: 'rhizophora_mucronata',
    species_name: 'Asiatic Mangrove / Loop-Root Mangrove',
    scientific_name: 'Rhizophora mucronata',
    number_of_plants: 500,
    land_area: 2500,
    area_unit: 'sq_meters' as const,
    planting_date: new Date().toISOString().slice(0, 10),
    status: 'Planning' as const,
    description: '',
    soil_type: 'Saline Marine Mud/Clay',
    water_condition: 'Regular Tidal Inundation',
    photos: [] as string[]
  });

  // Tab 6: Plant Growth Monitoring
  const [selectedProjectIdForMonitoring, setSelectedProjectIdForMonitoring] = useState<string>('');
  const [monitoringRecords, setMonitoringRecords] = useState<PlantMonitoringRecord[]>([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState<boolean>(false);
  const [isAddMonitoringModalOpen, setIsAddMonitoringModalOpen] = useState<boolean>(false);
  const [newMonitoringData, setNewMonitoringData] = useState({
    project_id: '',
    monitoring_date: new Date().toISOString().slice(0, 10),
    plant_height_cm: 60,
    surviving_plants: 460,
    dead_plants: 40,
    health_condition: 'Good' as const,
    soil_condition: 'Moist Saline Mud',
    water_condition: 'Optimal Inundation',
    photo_url: '',
    observations: ''
  });

  // Tab 7: Planting Calendar
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarSpeciesFilter, setCalendarSpeciesFilter] = useState<string>('');

  // Initial Data Fetch
  useEffect(() => {
    const initializePlanner = async () => {
      try {
        setLoading(true);
        const speciesRes = await api.getSpeciesList();
        setSpeciesList(speciesRes.species);
        if (speciesRes.species.length > 0) {
          setSelectedSpeciesId(speciesRes.species[0].id);
        }

        // Auto-run initial recommendation
        const recRes = await api.getPlantRecommendations({
          country: recCountry,
          state: recState,
          location: recLocation,
          soil_type: recSoil,
          land_type: recLand,
          water_condition: recWater,
          planting_purpose: recPurpose,
          land_area: recArea,
          number_of_plants: recPlants
        });
        setRecommendationResult(recRes);

        // Fetch user projects
        const projRes = await api.getPlantingProjects();
        setProjects(projRes.projects);
        if (projRes.projects.length > 0) {
          setSelectedProjectIdForMonitoring(projRes.projects[0].id);
          const monRes = await api.getMonitoringRecords(projRes.projects[0].id);
          setMonitoringRecords(monRes.records);
        }

        // Fetch calendar events
        const calRes = await api.getPlantingCalendar();
        setCalendarEvents(calRes.events);

        // Run initial Growth calculation
        const growthRes = await api.calculateGrowth({
          species_id: 'rhizophora_mucronata',
          planting_date: growthPlantingDate,
          number_of_plants: growthPlantsCount,
          care_level: growthCareLevel
        });
        setGrowthResult(growthRes);

        // Run initial Land calculation
        const landRes = await api.calculateLandArea({
          species_id: 'rhizophora_mucronata',
          number_of_plants: landPlantsCount,
          available_land_area: landAvailableArea,
          area_unit: landAreaUnit,
          custom_spacing_m: landCustomSpacing,
          pathway_buffer_pct: landBufferPct
        });
        setLandResult(landRes);

        // Run initial Benefits calculation
        const benRes = await api.calculateEnvironmentalBenefits({
          species_id: 'rhizophora_mucronata',
          number_of_plants: benefitsPlantsCount,
          land_area_ha: benefitsAreaHa,
          stand_age_years: benefitsStandAge,
          survival_rate_pct: benefitsSurvivalRate
        });
        setBenefitsResult(benRes);

      } catch (err) {
        console.error('Failed to load planner initial data', err);
      } finally {
        setLoading(false);
      }
    };

    initializePlanner();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Handler: Run Recommendation
  const handleRunRecommendation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoadingRec(true);
      const res = await api.getPlantRecommendations({
        country: recCountry,
        state: recState,
        district: recDistrict,
        location: recLocation,
        soil_type: recSoil,
        land_type: recLand,
        water_condition: recWater,
        planting_purpose: recPurpose,
        land_area: recArea,
        number_of_plants: recPlants
      });
      setRecommendationResult(res);
      showNotification('success', 'Native species recommendations updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch recommendations');
    } finally {
      setLoadingRec(false);
    }
  };

  // Handler: Run Growth Calculator
  const handleRunGrowthCalculation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoadingGrowth(true);
      const res = await api.calculateGrowth({
        species_id: growthSpeciesId,
        planting_date: growthPlantingDate,
        number_of_plants: growthPlantsCount,
        initial_height_cm: growthInitHeight,
        soil_condition: growthSoilCond,
        sunlight_exposure: growthSunExposure,
        water_availability: growthWaterAvail,
        care_level: growthCareLevel
      });
      setGrowthResult(res);
      showNotification('success', 'Estimated plant growth timeline computed.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to compute growth timeline');
    } finally {
      setLoadingGrowth(false);
    }
  };

  // Handler: Run Land Area Calculator
  const handleRunLandCalculation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoadingLand(true);
      const res = await api.calculateLandArea({
        species_id: landSpeciesId,
        number_of_plants: landPlantsCount,
        available_land_area: landAvailableArea,
        area_unit: landAreaUnit,
        custom_spacing_m: landCustomSpacing,
        pathway_buffer_pct: landBufferPct
      });
      setLandResult(res);
      showNotification('success', 'Land area requirements & visual layout computed.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to calculate land requirements');
    } finally {
      setLoadingLand(false);
    }
  };

  // Handler: Run Benefits Calculator
  const handleRunBenefitsCalculation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoadingBenefits(true);
      const res = await api.calculateEnvironmentalBenefits({
        species_id: benefitsSpeciesId,
        number_of_plants: benefitsPlantsCount,
        land_area_ha: benefitsAreaHa,
        stand_age_years: benefitsStandAge,
        survival_rate_pct: benefitsSurvivalRate
      });
      setBenefitsResult(res);
      showNotification('success', 'Ecosystem benefits & allometric carbon stocks evaluated.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to calculate environmental benefits');
    } finally {
      setLoadingBenefits(false);
    }
  };

  // Handler: Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSp = speciesList.find(s => s.id === newProjectData.species_id);
      const payload = {
        ...newProjectData,
        species_name: selectedSp ? selectedSp.common_name : newProjectData.species_name,
        scientific_name: selectedSp ? selectedSp.scientific_name : newProjectData.scientific_name
      };

      const res = await api.createPlantingProject(payload);
      setProjects([res.project, ...projects]);
      setIsCreateProjectModalOpen(false);
      showNotification('success', `Planting project "${res.project.project_name}" created successfully!`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create planting project');
    }
  };

  // Handler: Delete Project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this planting project and all its monitoring records?')) return;
    try {
      await api.deletePlantingProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProjectIdForMonitoring === projectId) {
        setSelectedProjectIdForMonitoring(projects.length > 1 ? projects.filter(p => p.id !== projectId)[0].id : '');
      }
      showNotification('success', 'Project deleted successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete project');
    }
  };

  // Handler: Select Project for Monitoring
  const handleSelectProjectForMonitoring = async (projId: string) => {
    setSelectedProjectIdForMonitoring(projId);
    try {
      setLoadingMonitoring(true);
      const res = await api.getMonitoringRecords(projId);
      setMonitoringRecords(res.records);
    } catch (err) {
      console.error('Failed to load project monitoring records', err);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  // Handler: Add Monitoring Record
  const handleAddMonitoringRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForMonitoring) {
      showNotification('error', 'Please select a planting project first.');
      return;
    }
    try {
      const payload = {
        ...newMonitoringData,
        project_id: selectedProjectIdForMonitoring
      };
      const res = await api.createMonitoringRecord(payload);
      setMonitoringRecords([res.record, ...monitoringRecords]);
      // Update local project status metrics
      setProjects(projects.map(p => {
        if (p.id === selectedProjectIdForMonitoring) {
          return {
            ...p,
            current_survival_pct: res.record.survival_percentage,
            latest_height_cm: res.record.plant_height_cm,
            total_monitoring_logs: p.total_monitoring_logs + 1
          };
        }
        return p;
      }));
      setIsAddMonitoringModalOpen(false);
      showNotification('success', 'Monitoring check-in logged! Survival percentage & health updated.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to add monitoring record');
    }
  };

  // Prefill Growth or Benefits from Recommendation
  const handlePlanWithSpecies = (speciesId: string) => {
    setGrowthSpeciesId(speciesId);
    setLandSpeciesId(speciesId);
    setBenefitsSpeciesId(speciesId);
    setActiveTab('growth');
  };

  const currentProject = projects.find(p => p.id === selectedProjectIdForMonitoring);

  const tabs = [
    { id: 'selection', label: '1. Plant Selection', icon: Sprout },
    { id: 'growth', label: '2. Growth Calculator', icon: TrendingUp },
    { id: 'land', label: '3. Land Area Calculator', icon: Ruler },
    { id: 'benefits', label: '4. Environmental Benefits', icon: Scale },
    { id: 'projects', label: '5. My Planting Projects', icon: FolderHeart, badge: projects.length },
    { id: 'monitoring', label: '6. Plant Growth Monitoring', icon: Activity },
    { id: 'calendar', label: '7. Planting Calendar', icon: Calendar },
    { id: 'education', label: '8. Educational Guide', icon: BookOpen }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-forest-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading Plant Growth & Blue Carbon Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner with Call-to-Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-900 via-teal-950 to-navy-950 p-6 md:p-8 border border-emerald-500/30 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-forest-500/20 text-emerald-300 border border-forest-500/40 flex items-center space-x-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <span>Community & Restoration Hub</span>
              </span>
              <span className="text-xs text-slate-300">• Powered by Pantropical Allometry (Chave et al. 2014)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Plant Growth & Blue Carbon Planner
            </h1>
            <p className="text-xs md:text-sm text-slate-200 mt-2 leading-relaxed">
              Plan native tree plantings, calculate land spacing, simulate biological growth timelines,
              and project verifiable blue carbon benefits. Designed for ordinary users, farmers, students, and conservation communities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('projects');
                setIsCreateProjectModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white transition flex items-center space-x-2 shadow-lg shadow-emerald-950/50"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>Start Your Planting Journey</span>
            </button>
            <button
              onClick={() => {
                setAssistLocation(`${recDistrict}, ${recState}`);
                setAssistLandArea(recArea);
                setAssistSpeciesId(selectedSpeciesId);
                setAssistPlantsCount(recPlants);
                setAssistSoilType(recSoil);
                setAssistWaterAvail(recWater);
                setAssistPurpose(recPurpose);
                setIsAssistanceModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600/90 hover:bg-purple-600 text-white transition flex items-center space-x-1.5 shadow-lg shadow-purple-950/40"
            >
              <HeartHandshake className="w-4 h-4 text-purple-200" />
              <span>Request Planting Assistance</span>
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-navy-800/80 hover:bg-navy-800 border border-slate-700 text-slate-200 transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-ocean-300" />
              <span>Educational Guide</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background blur */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-forest-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Global Notification Toast */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-3.5 py-2.5 rounded-t-xl text-xs font-medium whitespace-nowrap transition-all border-b-2
                ${isActive
                  ? 'border-forest-500 bg-forest-500/10 text-forest-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-900'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-forest-500 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-forest-600 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PLANT SELECTION                                                */}
      {/* ========================================================================= */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {/* Top Form: Environmental & Site Filters */}
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-forest-500" />
                  <span>Site Environmental Conditions & Planting Objective</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Input your regional soil, water, and land conditions to identify optimal native species.
                </p>
              </div>
              <button
                onClick={handleRunRecommendation}
                disabled={loadingRec}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center space-x-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRec ? 'animate-spin' : ''}`} />
                <span>Update Recommendations</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Country</label>
                <select
                  value={recCountry}
                  onChange={e => setRecCountry(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="India">India</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">State / Province</label>
                <select
                  value={recState}
                  onChange={e => setRecState(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="West Bengal">West Bengal (Sundarbans)</option>
                  <option value="Odisha">Odisha (Bhitarkanika)</option>
                  <option value="Tamil Nadu">Tamil Nadu (Pichavaram)</option>
                  <option value="Gujarat">Gujarat (Gulf of Kutch)</option>
                  <option value="Kerala">Kerala (Ashtamudi)</option>
                  <option value="Andhra Pradesh">Andhra Pradesh (Coringa)</option>
                  <option value="Maharashtra">Maharashtra (Thane Creek)</option>
                  <option value="All Indian States">Other Inland States</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Location Type</label>
                <select
                  value={recLocation}
                  onChange={e => setRecLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Coastal">Coastal (Intertidal / Shoreline)</option>
                  <option value="Riverbank / Estuarine">Riverbank / Estuarine</option>
                  <option value="Island">Island / Delta Archipelago</option>
                  <option value="Inland / Terrestrial">Inland / Terrestrial (Non-Tidal)</option>
                  <option value="Urban">Urban / Park Greenery</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Soil Type</label>
                <select
                  value={recSoil}
                  onChange={e => setRecSoil(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Saline Marine Mud/Clay">Saline Marine Mud/Clay</option>
                  <option value="Silty Alluvial">Silty Alluvial (Estuary/River)</option>
                  <option value="Sandy Coastal">Sandy Coastal Dunes</option>
                  <option value="Clay Loam">Clay Loam (Terrestrial)</option>
                  <option value="Black Cotton Soil">Black Cotton Soil</option>
                  <option value="Red Sandy Loam">Red Sandy Loam</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Land Type</label>
                <select
                  value={recLand}
                  onChange={e => setRecLand(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Intertidal Mudflat">Intertidal Mudflat</option>
                  <option value="High Intertidal Fringe">High Intertidal Fringe</option>
                  <option value="Estuary Basin">Estuary Basin</option>
                  <option value="Degraded Coastal Land">Degraded Coastal Land</option>
                  <option value="Riverbank / Riparian">Riverbank / Riparian Buffer</option>
                  <option value="Inland Farmland">Inland Farmland / Agroforestry</option>
                  <option value="Community Homestead">Community Homestead</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Water Condition</label>
                <select
                  value={recWater}
                  onChange={e => setRecWater(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Regular Tidal Inundation">Regular Tidal Inundation (Twice Daily)</option>
                  <option value="Brackish/Tidal Surge">Brackish/Tidal Surge (Spring Tides)</option>
                  <option value="Fresh Water Seasonal">Fresh Water Seasonal</option>
                  <option value="Perennial Irrigation">Perennial Irrigation</option>
                  <option value="Rainfed Only">Rainfed Only</option>
                  <option value="Semi-Arid / Low Rainfall">Semi-Arid / Low Rainfall</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Planting Purpose</label>
                <select
                  value={recPurpose}
                  onChange={e => setRecPurpose(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Blue Carbon & Coastal Protection">Blue Carbon & Coastal Protection</option>
                  <option value="Cyclone & Wave Attenuation">Cyclone & Wave Attenuation</option>
                  <option value="Soil Salinity Remediation">Soil Salinity Remediation</option>
                  <option value="Biodiversity Restoration">Biodiversity Restoration</option>
                  <option value="Timber & Agroforestry">Timber & Agroforestry</option>
                  <option value="Fruit & Non-Timber Forest Products">Fruit & Non-Timber Forest Products</option>
                  <option value="Urban Greenery & Shade">Urban Greenery & Shade</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Target Plant Count</label>
                <input
                  type="number"
                  min="1"
                  value={recPlants}
                  onChange={e => setRecPlants(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="e.g. 1000"
                />
              </div>
            </div>
          </div>

          {/* Scientific Constraint Alert Banner */}
          {recLocation === 'Inland / Terrestrial' || recWater === 'Rainfed Only' ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Inland Site Detected: Mangrove Species Excluded</p>
                <p className="mt-0.5">
                  True mangrove species (*Rhizophora*, *Avicennia*, *Sonneratia*, *Bruguiera*, *Ceriops*, *Heritiera*)
                  strictly require marine/brackish tidal water and mudflat hydrology. They cannot survive in inland terrestrial soils.
                  Native terrestrial and riparian trees (*Neem*, *Karanja*, *Arjun*, *Jamun*) are recommended instead.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Coastal / Tidal Habitat Detected: Blue Carbon Mangroves Prioritized</p>
                <p className="mt-0.5">
                  High-capacity mangrove species with extensive stilt roots and pneumatophores are recommended for wave attenuation,
                  shoreline sediment binding, and deep peaty soil carbon sequestration.
                </p>
              </div>
            </div>
          )}

          {/* Recommended Species Cards */}
          {recommendationResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Recommended Native Species ({recommendationResult.total_recommended})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {recommendationResult.summary}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendationResult.recommendations.map((item, idx) => {
                  const sp = item.species;
                  return (
                    <div
                      key={sp.id}
                      className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-forest-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sp.is_mangrove
                              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {sp.category}
                          </span>
                          <span className="text-xs font-extrabold text-forest-600 dark:text-emerald-400 bg-forest-500/10 px-2 py-0.5 rounded-lg">
                            {item.suitability_score}% Match
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {sp.common_name}
                        </h4>
                        <p className="text-xs italic text-slate-500 dark:text-slate-400 mb-3">
                          {sp.scientific_name} ({sp.family})
                        </p>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400">Wood Density:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{sp.wood_density_g_cm3} g/cm³</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Spacing:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{sp.recommended_spacing_m}m × {sp.recommended_spacing_m}m</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Mature Height:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{sp.mature_height_m} meters</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Growth Rate:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{sp.growth_rate_category}</p>
                          </div>
                        </div>

                        {/* Key Info */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                          <p><strong className="text-slate-800 dark:text-white">Planting Season:</strong> {sp.suitable_planting_season}</p>
                          <p><strong className="text-slate-800 dark:text-white">Coastal Protection:</strong> {sp.wave_attenuation_capacity}</p>
                          <p><strong className="text-slate-800 dark:text-white">Care Advice:</strong> {sp.care_instructions.slice(0, 140)}...</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handlePlanWithSpecies(sp.id)}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center justify-center space-x-1"
                        >
                          <span>Calculate Growth</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setNewProjectData({
                              ...newProjectData,
                              species_id: sp.id,
                              species_name: sp.common_name,
                              scientific_name: sp.scientific_name
                            });
                            setActiveTab('projects');
                            setIsCreateProjectModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 transition"
                          title="Create Project with this species"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unsuitable Species Section */}
              {recommendationResult.unsuitable_species.length > 0 && (
                <div className="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Incompatible Species for this Setting ({recommendationResult.unsuitable_species.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {recommendationResult.unsuitable_species.map(u => (
                      <div key={u.species_id} className="p-3 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800/60">
                        <p className="font-semibold text-rose-500 dark:text-rose-400">{u.common_name} ({u.scientific_name})</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{u.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: GROWTH CALCULATOR                                              */}
      {/* ========================================================================= */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-forest-500" />
              <span>Plant Growth Timeline & Milestone Simulator</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Simulates species-specific biological development milestones from germination through biological maturity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Select Species</label>
                <select
                  value={growthSpeciesId}
                  onChange={e => setGrowthSpeciesId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {speciesList.map(s => (
                    <option key={s.id} value={s.id}>{s.common_name} ({s.scientific_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Planting Date</label>
                <input
                  type="date"
                  value={growthPlantingDate}
                  onChange={e => setGrowthPlantingDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Number of Plants</label>
                <input
                  type="number"
                  min="1"
                  value={growthPlantsCount}
                  onChange={e => setGrowthPlantsCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Initial Sapling Height (cm)</label>
                <input
                  type="number"
                  min="0"
                  value={growthInitHeight}
                  onChange={e => setGrowthInitHeight(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Care & Maintenance Level</label>
                <select
                  value={growthCareLevel}
                  onChange={e => setGrowthCareLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="High">High (Fenced, Weeded, Regular Monitoring)</option>
                  <option value="Moderate">Moderate (Quarterly Inspection, Basic Protection)</option>
                  <option value="Low">Low (Direct Sowing, Natural Rainfed)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Soil Quality</label>
                <select
                  value={growthSoilCond}
                  onChange={e => setGrowthSoilCond(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Rich / Fertile">Rich / Fertile Alluvial Mud</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor / Compacted</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Sunlight Exposure</label>
                <select
                  value={growthSunExposure}
                  onChange={e => setGrowthSunExposure(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Full Sun">Full Sun (Optimal)</option>
                  <option value="Partial Shade">Partial Shade</option>
                  <option value="Deep Shade">Deep Shade</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunGrowthCalculation}
                  disabled={loadingGrowth}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGrowth ? 'animate-spin' : ''}`} />
                  <span>Simulate Growth</span>
                </button>
              </div>
            </div>
          </div>

          {/* Growth Milestones Timeline */}
          {growthResult && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Biological Milestones for {growthResult.species_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Species-specific growth milestones calculated based on {growthCareLevel} care and environmental factors.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-forest-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-forest-500/20">
                    Speed Factor: {growthResult.growth_speed_factor}x
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {growthResult.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-7 h-7 rounded-full bg-forest-600 text-white font-bold text-xs flex items-center justify-center mb-2 shadow">
                          {idx + 1}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.stage}
                        </h4>
                        <div className="my-2 py-1 px-2 rounded bg-forest-500/10 text-forest-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                          ⏱ {m.timeframe}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Target Height:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{m.expected_height_cm} cm</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Survival Target:</span>
                          <span className="font-bold text-emerald-500">{m.survival_expectation_pct}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allometric Growth Curve Chart */}
              <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      20-Year Height & Carbon Accumulation Trajectory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Allometric simulation: Chave et al. (2014) pantropical model & Von Bertalanffy growth curve.
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthResult.growth_curve} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#64748b" label={{ value: 'Stand Age (Years)', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#10b981" label={{ value: 'Tree Height (m)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#10b981' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#0284c7" label={{ value: 'Total Carbon (Tonnes)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#0284c7' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="height_m" name="Mean Tree Height (m)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="carbon_tonnes" name="Living Carbon Stock (Tonnes C)" stroke="#0284c7" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: LAND AREA CALCULATOR                                           */}
      {/* ========================================================================= */}
      {activeTab === 'land' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-forest-500" />
              <span>Interactive Land Area & Spacing Calculator</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Determine spacing requirements, plant capacity, pathway buffers, and visual layout geometry.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Species</label>
                <select
                  value={landSpeciesId}
                  onChange={e => {
                    setLandSpeciesId(e.target.value);
                    const sp = speciesList.find(s => s.id === e.target.value);
                    if (sp) setLandCustomSpacing(sp.recommended_spacing_m);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {speciesList.map(s => (
                    <option key={s.id} value={s.id}>{s.common_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Target Plant Count</label>
                <input
                  type="number"
                  min="1"
                  value={landPlantsCount}
                  onChange={e => setLandPlantsCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Available Land Area</label>
                <input
                  type="number"
                  min="1"
                  value={landAvailableArea}
                  onChange={e => setLandAvailableArea(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Area Unit</label>
                <select
                  value={landAreaUnit}
                  onChange={e => setLandAreaUnit(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="sq_meters">Square Meters (m²)</option>
                  <option value="hectares">Hectares (ha)</option>
                  <option value="acres">Acres</option>
                  <option value="sq_feet">Square Feet (sq ft)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Plant Spacing (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10.0"
                  value={landCustomSpacing}
                  onChange={e => setLandCustomSpacing(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Access Pathway & Perimeter Buffer:</span>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={landBufferPct}
                  onChange={e => setLandBufferPct(Number(e.target.value))}
                  className="w-36 accent-forest-600"
                />
                <span className="font-bold text-slate-900 dark:text-white">{landBufferPct}%</span>
              </div>

              <button
                onClick={handleRunLandCalculation}
                disabled={loadingLand}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center space-x-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLand ? 'animate-spin' : ''}`} />
                <span>Calculate Spacing & Layout</span>
              </button>
            </div>
          </div>

          {/* Land Calculation Results */}
          {landResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Metrics Column */}
              <div className="space-y-4">
                {/* Sufficiency Badge Card */}
                <div className={`p-5 rounded-2xl border ${
                  landResult.is_sufficient
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    {landResult.is_sufficient ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                    )}
                    <h4 className="text-sm font-bold">{landResult.sufficiency_status}</h4>
                  </div>
                  <p className="text-xs leading-relaxed mt-1">{landResult.recommendation}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                    Area Allocation Breakdown
                  </h4>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Area Required per Plant:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{landResult.area_per_plant_m2} m² ({landResult.spacing_m}m × {landResult.spacing_m}m)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Total Recommended Area:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{landResult.total_required_in_unit} {landResult.unit} ({landResult.total_required_area_m2} m²)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Available Usable Area:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{landResult.usable_area_m2} m² (excl. {landResult.buffer_percentage}% buffer)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Access Channels & Buffer:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{landResult.buffer_area_m2} m²</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">Max Density Capacity:</span>
                    <span className="font-bold text-forest-600 dark:text-emerald-400 text-sm">{landResult.max_plants_capacity.toLocaleString()} plants</span>
                  </div>
                </div>
              </div>

              {/* Visual Planting Layout Column */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Visual Planting Layout Simulation</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {landResult.layout.pattern} &bull; {landResult.layout.rows} Rows × {landResult.layout.columns} Columns
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <span>Dimensions: </span>
                      <strong className="text-slate-800 dark:text-slate-200">{landResult.layout.plot_length_m}m × {landResult.layout.plot_width_m}m</strong>
                    </div>
                  </div>

                  {/* Layout Grid Canvas */}
                  <div className="relative p-6 rounded-xl bg-forest-950/20 dark:bg-forest-950/40 border-2 border-dashed border-forest-500/40 min-h-[220px] flex items-center justify-center overflow-hidden">
                    <div className="grid grid-cols-10 gap-2.5 p-3">
                      {Array.from({ length: Math.min(60, landResult.requested_plants) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-sm flex items-center justify-center transform hover:scale-125 transition cursor-pointer"
                          title={`Plant #${idx + 1}: ${landResult.spacing_m}m spacing`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                        </div>
                      ))}
                    </div>

                    {/* Perimeter Buffer Overlay Indicators */}
                    <div className="absolute top-1 left-2 text-[9px] text-forest-500 font-mono">← {landResult.buffer_percentage}% Buffer Border →</div>
                    <div className="absolute bottom-1 right-2 text-[9px] text-teal-500 font-mono">{landResult.layout.spacing_row_m}m Spacing Grid</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Green dots illustrate individual plant roots. Staggered grid reduces inter-canopy competition.</span>
                  <button
                    onClick={() => {
                      setNewProjectData({
                        ...newProjectData,
                        species_id: landResult.species_id,
                        number_of_plants: landResult.requested_plants,
                        land_area: landResult.available_area_input,
                        area_unit: landResult.unit as any
                      });
                      setActiveTab('projects');
                      setIsCreateProjectModalOpen(true);
                    }}
                    className="font-bold text-forest-600 dark:text-emerald-400 hover:underline"
                  >
                    Save to My Projects &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: ENVIRONMENTAL BENEFITS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'benefits' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-forest-500" />
              <span>Environmental & Blue Carbon Benefits Calculator</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Scientific estimation using Chave et al. (2014) pantropical allometry and IPCC Wetlands Supplement parameters.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Species</label>
                <select
                  value={benefitsSpeciesId}
                  onChange={e => setBenefitsSpeciesId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {speciesList.map(s => (
                    <option key={s.id} value={s.id}>{s.common_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Number of Plants</label>
                <input
                  type="number"
                  min="1"
                  value={benefitsPlantsCount}
                  onChange={e => setBenefitsPlantsCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Land Area (Hectares)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={benefitsAreaHa}
                  onChange={e => setBenefitsAreaHa(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Stand Age (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  value={benefitsStandAge}
                  onChange={e => setBenefitsStandAge(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunBenefitsCalculation}
                  disabled={loadingBenefits}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center justify-center space-x-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBenefits ? 'animate-spin' : ''}`} />
                  <span>Compute Benefits</span>
                </button>
              </div>
            </div>
          </div>

          {benefitsResult && (
            <div className="space-y-6">
              {/* Quantitative KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Aboveground Biomass (AGB)</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {benefitsResult.quantitative_estimates.above_ground_biomass_tonnes} Mg
                  </h3>
                  <p className="text-[10px] text-slate-400">Living woody stem & branches</p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Living Biomass</p>
                  <h3 className="text-xl font-bold text-forest-600 dark:text-emerald-400 mt-1">
                    {benefitsResult.quantitative_estimates.total_living_biomass_tonnes} Mg
                  </h3>
                  <p className="text-[10px] text-slate-400">AGB + Belowground root allocation</p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Carbon Storage</p>
                  <h3 className="text-xl font-bold text-ocean-600 dark:text-ocean-400 mt-1">
                    {benefitsResult.quantitative_estimates.total_carbon_storage_tonnes} t C
                  </h3>
                  <p className="text-[10px] text-slate-400">Living carbon + Sediment organic pool</p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">CO₂ Equivalent Stock</p>
                  <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                    {benefitsResult.quantitative_estimates.co2_equivalent_tonnes} t CO₂e
                  </h3>
                  <p className="text-[10px] text-teal-500 font-medium">±18.5% 95% Bootstrap CI</p>
                </div>
              </div>

              {/* Ecosystem Services & Coastal Protection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Wind className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Coastal Wave Attenuation</h4>
                  <p className="text-lg font-bold text-teal-500">
                    {benefitsResult.ecosystem_services.coastal_wave_attenuation.wave_energy_reduction_pct}% Energy Dissipated
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {benefitsResult.ecosystem_services.coastal_wave_attenuation.description}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sediment & Shoreline Binding</h4>
                  <p className="text-lg font-bold text-emerald-500">
                    {benefitsResult.ecosystem_services.sediment_stabilisation.sediment_trapped_rate}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {benefitsResult.ecosystem_services.sediment_stabilisation.details}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-ocean-500/10 text-ocean-400 flex items-center justify-center">
                    <Trees className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Biodiversity & Niche Habitat</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {benefitsResult.ecosystem_services.biodiversity_and_habitat.key_species_supported.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                    {benefitsResult.ecosystem_services.biodiversity_and_habitat.details}
                  </p>
                </div>
              </div>

              {/* Scientific Transparency & MRV Disclaimers */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-forest-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Scientific Formulation & Uncertainty Protocol
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Allometric Equation:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{benefitsResult.scientific_assumptions_and_transparency.allometric_formula}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Wood Core Density (ρ):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{benefitsResult.scientific_assumptions_and_transparency.wood_density_rho}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Carbon Fraction (CF):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{benefitsResult.scientific_assumptions_and_transparency.carbon_fraction_cf}</span>
                  </div>
                </div>

                {/* Explicit Regulatory Distinction Panel */}
                <div className="p-4 rounded-xl bg-navy-900/40 border border-slate-700/60 text-xs space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <span className="block text-[10px] text-emerald-400 font-bold uppercase">1. Estimated Potential</span>
                      <span className="font-bold text-white text-xs">ACTIVE MODEL</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <span className="block text-[10px] text-amber-400 font-bold uppercase">2. Measured Ground Truth</span>
                      <span className="font-bold text-slate-300 text-xs">REQUIRES FIELD INVENTORY</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-ocean-500/10 border border-ocean-500/30">
                      <span className="block text-[10px] text-ocean-400 font-bold uppercase">3. Independently Verified</span>
                      <span className="font-bold text-slate-300 text-xs">PENDING AUDIT</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <span className="block text-[10px] text-purple-400 font-bold uppercase">4. Issued Carbon Credits</span>
                      <span className="font-bold text-slate-300 text-xs">NOT ISSUED</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-300/90 italic text-center">
                    {benefitsResult.regulatory_and_mrv_classification.mandatory_disclaimer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: MY PLANTING PROJECTS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                My Community Planting Projects ({projects.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your active restoration plots, species selections, and carbon accumulation progress.
              </p>
            </div>
            <button
              onClick={() => setIsCreateProjectModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
              <Sprout className="w-12 h-12 text-forest-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Planting Projects Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Begin your mangrove or native tree planting initiative today to sequester blue carbon and protect coastlines.
              </p>
              <button
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-600 text-white hover:bg-forest-500 transition shadow"
              >
                Start Your Planting Journey
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => {
                const statusColors: Record<string, string> = {
                  'Planning': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                  'Ready for planting': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  'Planted': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                  'Growing': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  'Monitoring': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  'Completed': 'bg-forest-500/10 text-emerald-300 border-forest-500/20'
                };

                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-forest-500/40 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status & date */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[p.status] || 'bg-slate-500/10 text-slate-400'}`}>
                          {p.status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.planting_date}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {p.project_name}
                      </h4>
                      <p className="text-xs text-forest-600 dark:text-emerald-400 font-medium mb-1">
                        🌿 {p.species_name}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1 mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{p.location_name || `${p.district}, ${p.state}`}</span>
                      </p>

                      {/* Stats pill */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-slate-800 mb-3">
                        <div>
                          <span className="text-slate-400">Planted:</span>
                          <p className="font-bold text-slate-900 dark:text-white">{p.number_of_plants.toLocaleString()} plants</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Land Area:</span>
                          <p className="font-bold text-slate-900 dark:text-white">{p.land_area} {p.area_unit.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Survival Rate:</span>
                          <p className="font-bold text-emerald-500">{p.current_survival_pct}%</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Carbon Storage:</span>
                          <p className="font-bold text-ocean-400">{roundVal(p.estimated_co2e_kg / 1000)} t CO₂e</p>
                        </div>
                      </div>

                      {p.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedProjectIdForMonitoring(p.id);
                          handleSelectProjectForMonitoring(p.id);
                          setActiveTab('monitoring');
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center justify-center space-x-1"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Log Progress</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: PLANT GROWTH MONITORING                                        */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Project Selector Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Select Active Planting Project
              </label>
              <select
                value={selectedProjectIdForMonitoring}
                onChange={e => handleSelectProjectForMonitoring(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.species_name} • {p.number_of_plants} plants)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setNewMonitoringData({
                    ...newMonitoringData,
                    project_id: selectedProjectIdForMonitoring,
                    surviving_plants: currentProject ? Math.round(currentProject.number_of_plants * 0.9) : 450,
                    dead_plants: currentProject ? Math.round(currentProject.number_of_plants * 0.1) : 50
                  });
                  setIsAddMonitoringModalOpen(true);
                }}
                disabled={!selectedProjectIdForMonitoring}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white transition flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Record Monitoring Check-in</span>
              </button>
            </div>
          </div>

          {currentProject && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Initially Planted</span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{currentProject.number_of_plants}</h4>
                <p className="text-[10px] text-slate-400">Baseline seedlings</p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Current Survival Rate</span>
                <h4 className="text-xl font-bold text-emerald-500 mt-0.5">{currentProject.current_survival_pct}%</h4>
                <p className="text-[10px] text-slate-400">Calculated across logs</p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Latest Height</span>
                <h4 className="text-xl font-bold text-ocean-400 mt-0.5">
                  {currentProject.latest_height_cm ? `${currentProject.latest_height_cm} cm` : 'Pending'}
                </h4>
                <p className="text-[10px] text-slate-400">Average plant stature</p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Total Field Audits</span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{monitoringRecords.length}</h4>
                <p className="text-[10px] text-slate-400">Quarterly check-ins</p>
              </div>
            </div>
          )}

          {/* Historical Monitoring Records & Charts */}
          {monitoringRecords.length > 0 ? (
            <div className="space-y-6">
              {/* Progress Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Height Growth Progress (cm)</h4>
                  <p className="text-[11px] text-slate-500 mb-4">Measured stem elongation across inspection dates</p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...monitoringRecords].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="monitoring_date" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#10b981" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                        <Line type="monotone" dataKey="plant_height_cm" name="Plant Height (cm)" stroke="#10b981" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Plant Survival Percentage (%)</h4>
                  <p className="text-[11px] text-slate-500 mb-4">(Surviving Plants / Initially Planted) × 100</p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[...monitoringRecords].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="monitoring_date" tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} stroke="#0284c7" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="survival_percentage" name="Survival %" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-4">Historical Monitoring Records</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                        <th className="pb-2.5">Date</th>
                        <th className="pb-2.5">Height</th>
                        <th className="pb-2.5">Surviving / Dead</th>
                        <th className="pb-2.5">Survival %</th>
                        <th className="pb-2.5">Condition</th>
                        <th className="pb-2.5">Action Recommendations</th>
                        <th className="pb-2.5">Auditor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {monitoringRecords.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">{rec.monitoring_date}</td>
                          <td className="py-3 font-mono font-bold text-emerald-500">{rec.plant_height_cm} cm</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">
                            {rec.surviving_plants} live / {rec.dead_plants} dead
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-ocean-400">{rec.survival_percentage}%</span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.health_condition === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400' :
                              rec.health_condition === 'Good' ? 'bg-teal-500/10 text-teal-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {rec.health_condition}
                            </span>
                          </td>
                          <td className="py-3 max-w-xs">
                            <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                              {rec.recommended_actions.slice(0, 2).map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-3 text-slate-400 text-[11px]">{rec.recorded_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No monitoring check-ins recorded for this project yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: PLANTING CALENDAR                                              */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-forest-500" />
                  <span>12-Month Seasonal Planting & Maintenance Calendar</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calibrated for tropical mangrove deltas and native terrestrial forestry cycles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {calendarEvents.map((evt, idx) => {
                const isPrimePlanting = evt.activity_type.includes('Planting Window');
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      isPrimePlanting
                        ? 'bg-forest-500/10 dark:bg-forest-950/40 border-forest-500/40 shadow-sm'
                        : 'bg-white dark:bg-navy-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{evt.month}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPrimePlanting
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-navy-800 text-slate-500'
                        }`}>
                          {evt.season}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-forest-600 dark:text-emerald-400 mb-1">
                        {evt.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Checklist:</p>
                      <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {evt.action_items.map((act, i) => (
                          <li key={i} className="flex items-start space-x-1.5">
                            <Check className="w-3.5 h-3.5 text-forest-500 flex-shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: EDUCATIONAL GUIDE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'education' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-forest-500" />
              <span>Beginner-Friendly Blue Carbon & Tree Planting Guide</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Practical, scientifically sound advice on how trees mitigate climate change, why coastal mangroves are super-sequesters,
              and how to avoid the most common planting pitfalls.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">🌍</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Why Planting Trees Matters</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Trees act as living carbon vacuums. Through photosynthesis, they absorb atmospheric carbon dioxide (CO₂),
                  locking carbon into woody stems, bark, and deep root networks, while releasing life-giving oxygen.
                  Beyond carbon, trees modulate microclimates, regulate rainfall infiltration, and cool local ambient temperatures.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">🌊</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Why Mangroves Are Blue Carbon Superheroes</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mangrove forests store up to <strong>4 to 10 times more carbon</strong> per hectare than typical terrestrial tropical rainforests.
                  Most terrestrial carbon is stored in living trunks and leaves, which decompose upon death. In mangroves, roots deposit organic carbon
                  directly into deep, waterlogged, oxygen-deprived (anaerobic) marine sediment where microbial decomposition is halted for centuries.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">🛡️</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">How Coastal Trees Protect Shorelines</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  During cyclonic storms and tidal surges, open sea waves carry devastating mechanical force.
                  A 100-meter-wide belt of mature mangrove trees (*Rhizophora* stilt roots) reduces incoming wave energy by up to <strong>66%</strong>.
                  Their specialized root networks physically trap silt, building coastal elevation and safeguarding dykes from being washed away.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">🦀</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Biodiversity & Coastal Livelihoods</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Over 75% of commercially harvested tropical fish and prawn species spend a critical phase of their juvenile lives sheltered
                  inside the labyrinth of mangrove prop roots. Mangroves also support honeybees (producing mangrove honey), mud crabs,
                  and migratory shorebirds along global flyways.
                </p>
              </div>

              {/* Card 5 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">🌱</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">How to Select a Suitable Plant</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Always choose <strong>native species adapted to your specific tidal elevation</strong>.
                  Lower mudflats with daily high tides require pioneer *Sonneratia* or *Avicennia*.
                  Mid-intertidal zones thrive with stilt-rooted *Rhizophora*.
                  Never plant mangroves in non-tidal inland freshwater soils where they quickly succumb to osmotic stress and die.
                </p>
              </div>

              {/* Card 6 */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-2xl">⚠️</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Common Reasons Plantings Fail</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                  <li><strong>Incorrect Tidal Zone:</strong> Planting too deep underwater or above spring-tide lines.</li>
                  <li><strong>Wave Scouring:</strong> Young propagules dislodged before primary radicle anchors.</li>
                  <li><strong>Barnacle & Crab Predation:</strong> Barnacles suffocating green bark or crabs snipping stems.</li>
                  <li><strong>Hypersaline Ponding:</strong> Stagnant water evaporating into toxic salt crusts.</li>
                  <li><strong>Plastic & Net Entanglement:</strong> Marine debris wrapping around emerging pneumatophores.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PLANTING PROJECT                                            */}
      {/* ========================================================================= */}
      {isCreateProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-forest-500" />
                <span>Create New Planting Project</span>
              </h3>
              <button onClick={() => setIsCreateProjectModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectData.project_name}
                  onChange={e => setNewProjectData({ ...newProjectData, project_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="e.g. Sundarbans Embankment Mangrove Belt"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">State / Region *</label>
                  <input
                    type="text"
                    required
                    value={newProjectData.state}
                    onChange={e => setNewProjectData({ ...newProjectData, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g. West Bengal"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">District / County</label>
                  <input
                    type="text"
                    value={newProjectData.district}
                    onChange={e => setNewProjectData({ ...newProjectData, district: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g. South 24 Parganas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Exact Location / Village Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectData.location_name}
                  onChange={e => setNewProjectData({ ...newProjectData, location_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="e.g. Gosaba Island Tidal Mudflat"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Plant Species *</label>
                  <select
                    value={newProjectData.species_id}
                    onChange={e => setNewProjectData({ ...newProjectData, species_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {speciesList.map(s => (
                      <option key={s.id} value={s.id}>{s.common_name} ({s.scientific_name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Number of Plants *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProjectData.number_of_plants}
                    onChange={e => setNewProjectData({ ...newProjectData, number_of_plants: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Land Area *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProjectData.land_area}
                    onChange={e => setNewProjectData({ ...newProjectData, land_area: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Area Unit</label>
                  <select
                    value={newProjectData.area_unit}
                    onChange={e => setNewProjectData({ ...newProjectData, area_unit: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="sq_meters">Square Meters (m²)</option>
                    <option value="hectares">Hectares (ha)</option>
                    <option value="acres">Acres</option>
                    <option value="sq_feet">Square Feet (sq ft)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Planting Date *</label>
                  <input
                    type="date"
                    required
                    value={newProjectData.planting_date}
                    onChange={e => setNewProjectData({ ...newProjectData, planting_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Project Status</label>
                  <select
                    value={newProjectData.status}
                    onChange={e => setNewProjectData({ ...newProjectData, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Ready for planting">Ready for planting</option>
                    <option value="Planted">Planted</option>
                    <option value="Growing">Growing</option>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Project Description</label>
                <textarea
                  rows={3}
                  value={newProjectData.description}
                  onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Describe your community planting goals, site accessibility, and conservation benefits..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white shadow"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD MONITORING RECORD                                              */}
      {/* ========================================================================= */}
      {isAddMonitoringModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-forest-500" />
                <span>Log Plant Monitoring Check-in</span>
              </h3>
              <button onClick={() => setIsAddMonitoringModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMonitoringRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Monitoring Date *</label>
                  <input
                    type="date"
                    required
                    value={newMonitoringData.monitoring_date}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, monitoring_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Mean Plant Height (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMonitoringData.plant_height_cm}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, plant_height_cm: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Surviving Plants *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMonitoringData.surviving_plants}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, surviving_plants: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Dead / Missing Plants</label>
                  <input
                    type="number"
                    min="0"
                    value={newMonitoringData.dead_plants}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, dead_plants: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Health Condition</label>
                  <select
                    value={newMonitoringData.health_condition}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, health_condition: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Soil Condition</label>
                  <input
                    type="text"
                    value={newMonitoringData.soil_condition}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, soil_condition: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g. Moist Silt"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Water Condition</label>
                  <input
                    type="text"
                    value={newMonitoringData.water_condition}
                    onChange={e => setNewMonitoringData({ ...newMonitoringData, water_condition: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g. Tidal Flushing"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Photo Reference URL</label>
                <input
                  type="url"
                  value={newMonitoringData.photo_url}
                  onChange={e => setNewMonitoringData({ ...newMonitoringData, photo_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Field Observations</label>
                <textarea
                  rows={2}
                  value={newMonitoringData.observations}
                  onChange={e => setNewMonitoringData({ ...newMonitoringData, observations: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Describe leaf flush, crab presence, sediment accretion, or protective fence condition..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMonitoringModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-600 hover:bg-forest-500 text-white shadow"
                >
                  Log Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Planting Assistance Modal */}
      {isAssistanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Request Planting Assistance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit your site parameters directly to our Blue Carbon researchers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssistanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestAssistance} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Location / Region *
                  </label>
                  <input
                    type="text"
                    required
                    value={assistLocation}
                    onChange={e => setAssistLocation(e.target.value)}
                    placeholder="e.g. Mundra, Kachchh, Gujarat"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Target Species
                  </label>
                  <select
                    value={assistSpeciesId}
                    onChange={e => setAssistSpeciesId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {speciesList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.common_name} ({s.scientific_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Number of Plants
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={assistPlantsCount}
                    onChange={e => setAssistPlantsCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Available Land Area
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={assistLandArea}
                    onChange={e => setAssistLandArea(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Area Unit
                  </label>
                  <select
                    value={assistAreaUnit}
                    onChange={e => setAssistAreaUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="sq_meters">Square Metres (m²)</option>
                    <option value="sq_feet">Square Feet (ft²)</option>
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares (ha)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Soil Type
                  </label>
                  <input
                    type="text"
                    value={assistSoilType}
                    onChange={e => setAssistSoilType(e.target.value)}
                    placeholder="e.g. Saline Marine Mud"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Water Availability
                  </label>
                  <input
                    type="text"
                    value={assistWaterAvail}
                    onChange={e => setAssistWaterAvail(e.target.value)}
                    placeholder="e.g. Regular Tidal Inundation"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Planting Purpose
                  </label>
                  <input
                    type="text"
                    value={assistPurpose}
                    onChange={e => setAssistPurpose(e.target.value)}
                    placeholder="e.g. Coastal Shield & Carbon"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Additional Questions or Specific Challenges *
                </label>
                <textarea
                  required
                  rows={4}
                  value={assistQuestions}
                  onChange={e => setAssistQuestions(e.target.value)}
                  placeholder="Ask our researchers anything about tidal flushing, sapling spacing, seedling encrustation, expected survival rate, or soil salinity amendments..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssistanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssist}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>{submittingAssist ? 'Submitting Request...' : 'Send Assistance Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function roundVal(v: number): number {
  return Math.round(v * 10) / 10;
}
