/**
 * Moderation Admin Dashboard
 *
 * View and manage content moderation:
 * - Moderation logs with filtering
 * - Statistics and charts
 * - Configuration management
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ModerationLog {
  id: string;
  content_id: string;
  content_type: 'text' | 'audio' | 'video' | 'image';
  status: 'pending' | 'approved' | 'rejected' | 'review';
  flags: Array<{
    category: string;
    severity: string;
    score: number;
  }>;
  processing_time_ms: number;
  created_at: string;
  user_id?: string;
}

interface ModerationStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  avgProcessingTime: number;
}

export default function ModerationPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Content Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage AI content moderation
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Moderation Logs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ModerationOverview />
        </TabsContent>

        <TabsContent value="logs">
          <ModerationLogs />
        </TabsContent>

        <TabsContent value="config">
          <ModerationConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModerationOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: async (): Promise<ModerationStats> => {
      const { data, error } = await supabase.rpc('get_moderation_stats', {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) throw error;

      return {
        total: data?.total_moderated || 0,
        approved: data?.approved_count || 0,
        rejected: data?.rejected_count || 0,
        pending: 0,
        approvalRate: data?.approval_rate || 0,
        avgProcessingTime: data?.avg_processing_time_ms || 0
      };
    }
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading statistics...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Moderated</CardTitle>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats?.approved.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.approvalRate.toFixed(1)}% approval rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          <XCircle className="w-4 h-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats?.rejected.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {((stats?.rejected || 0) / (stats?.total || 1) * 100).toFixed(1)}% rejection rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.avgProcessingTime.toFixed(0)}ms
          </div>
          <p className="text-xs text-muted-foreground">Hive API latency</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ModerationLogs() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['moderation-logs', statusFilter, contentTypeFilter, page],
    queryFn: async (): Promise<ModerationLog[]> => {
      let query = supabase
        .from('moderation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (contentTypeFilter !== 'all') {
        query = query.eq('content_type', contentTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Moderation Logs</CardTitle>
            <CardDescription>
              View all content moderation decisions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="animate-pulse">Loading logs...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Processing Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.content_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell>
                      {log.flags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {log.flags.map((flag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {flag.category} ({(flag.score * 100).toFixed(0)}%)
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>{log.processing_time_ms}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={!logs || logs.length < pageSize}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ModerationConfig() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['moderation-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderation_config')
        .select('*')
        .eq('config_name', 'default')
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading configuration...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation Configuration</CardTitle>
        <CardDescription>
          Configure AI moderation thresholds and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Moderation Enabled</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.enabled ? 'default' : 'secondary'}>
                {config?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Strict Mode</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.strict_mode ? 'default' : 'secondary'}>
                {config?.strict_mode ? 'Strict (Low Tolerance)' : 'Normal'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Auto-Reject</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.auto_reject ? 'default' : 'secondary'}>
                {config?.auto_reject ? 'Automatic' : 'Manual Review'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Thresholds</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(config?.thresholds || {}).map(([category, threshold]) => (
              <div key={category} className="space-y-1">
                <label className="text-sm font-medium capitalize">
                  {category.replace('_', ' ')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary h-2 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${Number(threshold) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12">
                    {(Number(threshold) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    approved: { variant: 'default', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
    pending: { variant: 'secondary', label: 'Pending' },
    review: { variant: 'outline', label: 'Review' }
  };

  const config = variants[status] || variants.pending;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
