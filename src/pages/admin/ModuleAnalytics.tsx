// ============================================================================
// MODULE USAGE ANALYTICS DASHBOARD
// Shows which schools use which features, usage patterns, and revenue
// ============================================================================

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/types/feature';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package,
  Eye,
  Edit2,
  Save,
  X
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureAnalytics {
  code: string;
  name: string;
  category: string;
  price_monthly: number;
  price_termly: number;
  price_annual: number;
  schools_using: number;
  active_schools: number;
  total_revenue: number;
  total_actions: number;
  avg_actions: number;
  is_active: boolean;
  display_order: number;
}

interface SchoolAdoption {
  school_id: string;
  school_name: string;
  modules_subscribed: number;
  modules_active: number;
  total_module_actions: number;
  adoption_status: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModuleAnalytics() {
  const [viewMode, setViewMode] = useState<'features' | 'schools' | 'revenue'>('features');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<any>({});
  const queryClient = useQueryClient();

  // Fetch feature analytics
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['feature-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_usage_summary')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as FeatureAnalytics[];
    }
  });

  // Fetch school adoption summary
  const { data: schoolAdoption, isLoading: schoolsLoading } = useQuery({
    queryKey: ['school-adoption-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_school_adoption_summary');
      
      if (error) throw error;
      return data as SchoolAdoption[];
    }
  });

  // Update feature pricing mutation
  const updatePricing = useMutation({
    mutationFn: async (params: { code: string; prices: { price_monthly: number; price_termly: number; price_annual: number } }) => {
      const { code, prices } = params;
      
      const updates: any = {
        price_monthly: prices.price_monthly,
        price_termly: prices.price_termly,
        price_annual: prices.price_annual,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('module_catalog')
        .update(updates)
        .eq('code', code)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-analytics'] });
      setEditingFeature(null);
      setEditPrices({});
    }
  });

  // Filter features
  const filteredFeatures = features?.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedFeatures = filteredFeatures?.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, FeatureAnalytics[]>);

  // Calculate totals
  const totalMonthlyRevenue = features?.reduce((sum, f) => sum + (f.schools_using * f.price_monthly), 0) || 0;
  const totalCollected = features?.reduce((sum, f) => sum + f.total_revenue, 0) || 0;
  const totalSchools = schoolAdoption?.length || 0;
  const activeSchools = schoolAdoption?.filter(s => s.modules_active > 0).length || 0;

  const categories = ['all', ...new Set(features?.map(f => f.category) || [])];

  // Get selected feature details
  const selectedFeatureData = features?.find(f => f.code === selectedFeature);
  const selectedFeatureSchools = schoolAdoption?.filter(s => s.modules_active > 0);

  const startEditing = (feature: FeatureAnalytics) => {
    setEditingFeature(feature.code);
    setEditPrices({
      price_monthly: feature.price_monthly,
      price_termly: feature.price_termly,
      price_annual: feature.price_annual,
    });
  };

  const saveEditing = (code: string) => {
    updatePricing.mutate({ 
      code, 
      prices: editPrices as { price_monthly: number; price_termly: number; price_annual: number } 
    });
  };

  const cancelEditing = () => {
    setEditingFeature(null);
    setEditPrices({});
  };

  if (featuresLoading || schoolsLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Module Usage Analytics</h1>
          <p className="text-gray-500">Track feature adoption, usage, and revenue</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Potential Revenue"
          value={formatCurrency(totalMonthlyRevenue)}
          subtext="Monthly"
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Collected"
          value={formatCurrency(totalCollected)}
          subtext="All time"
          color="green"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Active Schools"
          value={activeSchools.toString()}
          subtext={`of ${totalSchools} total`}
          color="purple"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Avg Features/School"
          value={(totalSchools > 0 ? (features?.reduce((sum, f) => sum + f.schools_using, 0) || 0) / totalSchools : 0).toFixed(1)}
          subtext="Modules per school"
          color="orange"
        />
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        <TabButton
          active={viewMode === 'features'}
          onClick={() => setViewMode('features')}
          icon={<Package className="w-4 h-4" />}
          label="Feature View"
        />
        <TabButton
          active={viewMode === 'schools'}
          onClick={() => setViewMode('schools')}
          icon={<Users className="w-4 h-4" />}
          label="School View"
        />
        <TabButton
          active={viewMode === 'revenue'}
          onClick={() => setViewMode('revenue')}
          icon={<DollarSign className="w-4 h-4" />}
          label="Revenue Analytics"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Features Table */}
      {viewMode === 'features' && (
        <div className="space-y-6">
          {Object.entries(groupedFeatures || {}).map(([category, categoryFeatures]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-700 capitalize flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  {category} Features
                  <span className="text-sm font-normal text-gray-400">({categoryFeatures.length})</span>
                </h3>
                <span className="text-sm font-medium text-indigo-600">
                  💰 {formatCurrency(categoryFeatures.reduce((sum, f) => sum + (f.schools_using * f.price_monthly), 0))}/mo
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Schools</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Usage</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categoryFeatures.map((feature) => (
                      <tr key={feature.code} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium text-gray-900">{feature.name}</div>
                            <div className="text-xs text-gray-400">{feature.code}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {editingFeature === feature.code ? (
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={editPrices.price_monthly ?? 0}
                                onChange={(e) => setEditPrices({ ...editPrices, price_monthly: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-center px-1 py-0.5 border rounded text-xs"
                                placeholder="Monthly"
                              />
                            </div>
                          ) : (
                            <span className="font-medium text-sm">{formatCurrency(feature.price_monthly)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium">{feature.schools_using}</span>
                            <span className="text-xs text-gray-400">/ {feature.active_schools}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium">{feature.total_actions}</span>
                            <span className="text-xs text-gray-400">avg {Math.round(feature.avg_actions)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">
                          {formatCurrency(feature.schools_using * feature.price_monthly)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            feature.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {feature.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingFeature === feature.code ? (
                              <>
                                <button
                                  onClick={() => saveEditing(feature.code)}
                                  className="p-1 hover:bg-green-100 rounded text-green-600 transition"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1 hover:bg-red-100 rounded text-red-600 transition"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditing(feature)}
                                className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition"
                                title="Edit Price"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* School View */}
      {viewMode === 'schools' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Subscribed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schoolAdoption?.map((school) => (
                  <tr key={school.school_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{school.school_name}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{school.modules_subscribed}</td>
                    <td className="px-4 py-3 text-center">{school.modules_active}</td>
                    <td className="px-4 py-3 text-right">{school.total_module_actions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        school.adoption_status.includes('✅') ? 'bg-green-100 text-green-800' :
                        school.adoption_status.includes('📈') ? 'bg-blue-100 text-blue-800' :
                        school.adoption_status.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {school.adoption_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      {viewMode === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Feature</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={features?.slice(0, 10)}>
                    <XAxis dataKey="code" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="schools_using" fill="#6366F1" name="Schools Using" />
                    <Bar dataKey="total_revenue" fill="#22C55E" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-600">Potential Monthly Revenue</span>
                    <span className="font-bold text-lg text-blue-700">{formatCurrency(totalMonthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-600">Total Collected</span>
                    <span className="font-bold text-lg text-green-700">{formatCurrency(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-gray-600">Outstanding</span>
                    <span className="font-bold text-lg text-orange-700">{formatCurrency(totalMonthlyRevenue - totalCollected)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-gray-600">Collection Rate</span>
                    <span className="font-bold text-lg text-purple-700">
                      {totalMonthlyRevenue > 0 ? Math.round((totalCollected / totalMonthlyRevenue) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, subtext, color }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-xl ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/50 rounded-lg">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtext && <p className="text-xs opacity-70">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}